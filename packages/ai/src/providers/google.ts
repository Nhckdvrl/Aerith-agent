import { GoogleGenAI } from "@google/genai";
import type { GenerateOptions, LLMEvent, LLMProvider, Message, Tool } from "../types.ts";

export type GoogleProviderOptions = {
	apiKey?: string;
	defaultModel?: string;
};

export class GoogleProvider implements LLMProvider {
	private readonly client: GoogleGenAI;
	private readonly defaultModel: string;

	constructor(options: GoogleProviderOptions = {}) {
		this.client = new GoogleGenAI({
			apiKey: options.apiKey ?? process.env.GOOGLE_API_KEY,
		});
		this.defaultModel = options.defaultModel ?? "gemini-2.0-flash";
	}

	async *generate(messages: Message[], tools: Tool[], options: GenerateOptions = {}): AsyncIterable<LLMEvent> {
		const model = options.model ?? this.defaultModel;
		const systemPrompt = options.systemPrompt;
		const googleTools = tools.map(toGoogleTool);
		const contents = messages.map(toGoogleContent);

		const response = await this.client.models.generateContent({
			model,
			config: {
				temperature: options.temperature,
				maxOutputTokens: options.maxTokens,
				systemInstruction: systemPrompt,
				tools: googleTools.length > 0 ? (googleTools as any) : undefined,
			},
			contents: contents as any,
		} as any);

		for (const candidate of response.candidates ?? []) {
			for (const part of candidate.content?.parts ?? []) {
				if ("text" in part && typeof part.text === "string") {
					yield { type: "text", delta: part.text };
				}
				if ("functionCall" in part && part.functionCall) {
					yield {
						type: "toolCall",
						toolCall: {
							id: part.functionCall.name ?? "",
							name: part.functionCall.name ?? "",
							arguments: JSON.stringify(part.functionCall.args),
						},
					};
				}
			}
		}
	}
}

function toGoogleContent(message: Message): { role: string; parts: unknown[] } {
	if (message.role === "tool") {
		return {
			role: "user",
			parts: [
				{
					functionResponse: {
						name: message.toolCallId ?? "",
						response: { result: typeof message.content === "string" ? message.content : "" },
					},
				},
			],
		};
	}
	if (message.role === "assistant" && message.toolCalls) {
		const parts: unknown[] = [];
		if (typeof message.content === "string" && message.content) {
			parts.push({ text: message.content });
		}
		for (const toolCall of message.toolCalls) {
			parts.push({
				functionCall: {
					name: toolCall.name,
					args: parseArgs(toolCall.arguments),
				},
			});
		}
		return { role: "model", parts };
	}
	if (Array.isArray(message.content)) {
		const text = message.content.map((part) => (part.type === "text" ? part.text : "")).join("");
		return { role: message.role === "user" ? "user" : "model", parts: [{ text }] };
	}
	return { role: message.role === "user" ? "user" : "model", parts: [{ text: message.content }] };
}

function toGoogleTool(tool: Tool): {
	functionDeclarations: { name: string; description: string; parameters: unknown }[];
} {
	return {
		functionDeclarations: [
			{
				name: tool.name,
				description: tool.description,
				parameters: tool.parameters,
			},
		],
	};
}

function parseArgs(args: string): Record<string, unknown> {
	try {
		return JSON.parse(args) as Record<string, unknown>;
	} catch {
		return {};
	}
}
