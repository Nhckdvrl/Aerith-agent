import Anthropic from "@anthropic-ai/sdk";
import type { GenerateOptions, LLMEvent, LLMProvider, Message, Tool } from "../types.ts";

export type AnthropicProviderOptions = {
	apiKey?: string;
	defaultModel?: string;
};

export class AnthropicProvider implements LLMProvider {
	private readonly client: Anthropic;
	private readonly defaultModel: string;

	constructor(options: AnthropicProviderOptions = {}) {
		this.client = new Anthropic({
			apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
		});
		this.defaultModel = options.defaultModel ?? "claude-3-5-sonnet-latest";
	}

	async *generate(messages: Message[], tools: Tool[], options: GenerateOptions = {}): AsyncIterable<LLMEvent> {
		const model = options.model ?? this.defaultModel;
		const systemPrompt = options.systemPrompt;
		const anthropicMessages = messages.map(toAnthropicMessage);
		const anthropicTools = tools.map(toAnthropicTool);

		const stream = await this.client.messages.stream({
			model,
			max_tokens: options.maxTokens ?? 4096,
			temperature: options.temperature,
			messages: anthropicMessages,
			system: systemPrompt,
			tools: anthropicTools.length > 0 ? anthropicTools : undefined,
		});

		let textBuffer = "";
		let toolId: string | undefined;
		let toolName: string | undefined;
		let toolArgs = "";

		for await (const event of stream) {
			if (event.type === "content_block_delta") {
				if (event.delta.type === "text_delta") {
					textBuffer += event.delta.text;
				}
				if (event.delta.type === "input_json_delta") {
					toolArgs += event.delta.partial_json;
				}
			} else if (event.type === "content_block_start") {
				if (event.content_block.type === "tool_use") {
					if (textBuffer) {
						yield { type: "text", delta: textBuffer };
						textBuffer = "";
					}
					toolId = event.content_block.id;
					toolName = event.content_block.name;
					toolArgs = "";
				}
			} else if (event.type === "content_block_stop") {
				if (textBuffer) {
					yield { type: "text", delta: textBuffer };
					textBuffer = "";
				}
				if (toolId && toolName) {
					yield {
						type: "toolCall",
						toolCall: {
							id: toolId,
							name: toolName,
							arguments: toolArgs || "{}",
						},
					};
					toolId = undefined;
					toolName = undefined;
					toolArgs = "";
				}
			}
		}

		if (textBuffer) {
			yield { type: "text", delta: textBuffer };
		}
		if (toolId && toolName) {
			yield {
				type: "toolCall",
				toolCall: {
					id: toolId,
					name: toolName,
					arguments: toolArgs || "{}",
				},
			};
		}
	}
}

function toAnthropicMessage(message: Message): Anthropic.Messages.MessageParam {
	if (message.role === "tool") {
		return {
			role: "user",
			content: [
				{
					type: "tool_result",
					tool_use_id: message.toolCallId ?? "",
					content: typeof message.content === "string" ? message.content : "",
				},
			],
		};
	}
	if (message.role === "assistant" && message.toolCalls) {
		const content: Anthropic.Messages.ContentBlockParam[] = [];
		if (typeof message.content === "string" && message.content) {
			content.push({ type: "text", text: message.content });
		}
		for (const toolCall of message.toolCalls) {
			content.push({
				type: "tool_use",
				id: toolCall.id,
				name: toolCall.name,
				input: parseArgs(toolCall.arguments),
			});
		}
		return { role: "assistant", content };
	}
	if (Array.isArray(message.content)) {
		return {
			role: message.role,
			content: message.content.map((part) => {
				if (part.type === "text") {
					return { type: "text", text: part.text };
				}
				return { type: "image", source: { type: "url", url: part.url } } as Anthropic.Messages.ImageBlockParam;
			}),
		};
	}
	return { role: message.role, content: message.content };
}

function toAnthropicTool(tool: Tool): Anthropic.Messages.Tool {
	return {
		name: tool.name,
		description: tool.description,
		input_schema: tool.parameters as Anthropic.Messages.Tool["input_schema"],
	};
}

function parseArgs(args: string): Record<string, unknown> {
	try {
		return JSON.parse(args) as Record<string, unknown>;
	} catch {
		return {};
	}
}
