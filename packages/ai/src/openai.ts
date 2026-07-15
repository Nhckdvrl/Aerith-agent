import OpenAI from "openai";
import type { GenerateOptions, LLMEvent, LLMProvider, Message, Tool } from "./types.ts";

export type OpenAIProviderOptions = {
	apiKey?: string;
	baseURL?: string;
	defaultModel?: string;
};

export class OpenAIProvider implements LLMProvider {
	private readonly client: OpenAI;
	private readonly defaultModel: string;

	constructor(options: OpenAIProviderOptions = {}) {
		this.client = new OpenAI({
			apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
			baseURL: options.baseURL,
		});
		this.defaultModel = options.defaultModel ?? "gpt-4o-mini";
	}

	async *generate(messages: Message[], tools: Tool[], options: GenerateOptions = {}): AsyncIterable<LLMEvent> {
		const model = options.model ?? this.defaultModel;
		const openaiMessages = messages.map(toOpenAIMessage);
		if (options.systemPrompt) {
			openaiMessages.unshift({ role: "system", content: options.systemPrompt });
		}
		const openaiTools = tools.map(toOpenAITool);
		const stream = await this.client.chat.completions.create({
			model,
			messages: openaiMessages,
			tools: openaiTools.length > 0 ? openaiTools : undefined,
			temperature: options.temperature,
			max_tokens: options.maxTokens,
			stream: true,
		});
		const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();
		for await (const chunk of stream) {
			const choice = chunk.choices[0];
			if (!choice) {
				continue;
			}
			const delta = choice.delta;
			if (delta.content) {
				yield { type: "text", delta: delta.content };
			}
			if (delta.tool_calls) {
				for (const toolCallDelta of delta.tool_calls) {
					const index = toolCallDelta.index;
					const existing = toolCalls.get(index) ?? { id: "", name: "", arguments: "" };
					existing.id = toolCallDelta.id ?? existing.id;
					existing.name = toolCallDelta.function?.name ?? existing.name;
					existing.arguments += toolCallDelta.function?.arguments ?? "";
					toolCalls.set(index, existing);
				}
			}
		}
		for (const toolCall of toolCalls.values()) {
			yield { type: "toolCall", toolCall };
		}
	}
}

function toOpenAIMessage(message: Message): OpenAI.Chat.ChatCompletionMessageParam {
	if (message.role === "tool") {
		return {
			role: "tool",
			content: typeof message.content === "string" ? message.content : "",
			tool_call_id: message.toolCallId ?? "",
		};
	}
	if (message.role === "assistant" && message.toolCalls) {
		return {
			role: "assistant",
			content: typeof message.content === "string" ? message.content : "",
			tool_calls: message.toolCalls.map((toolCall) => ({
				id: toolCall.id,
				type: "function",
				function: {
					name: toolCall.name,
					arguments: toolCall.arguments,
				},
			})),
		};
	}
	if (Array.isArray(message.content)) {
		return {
			role: message.role,
			content: message.content.map((part) => {
				if (part.type === "text") {
					return { type: "text", text: part.text };
				}
				return { type: "image_url", image_url: { url: part.url } };
			}),
		} as OpenAI.Chat.ChatCompletionUserMessageParam;
	}
	return { role: message.role, content: message.content };
}

function toOpenAITool(tool: Tool): OpenAI.Chat.ChatCompletionTool {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters as OpenAI.Chat.ChatCompletionTool["function"]["parameters"],
		},
	};
}
