export type Role = "user" | "assistant" | "tool";

export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image"; url: string; mimeType?: string };
export type ContentPart = TextContent | ImageContent;

export type ToolCall = {
	id: string;
	name: string;
	arguments: string;
};

export type Message = {
	role: Role;
	content: string | ContentPart[];
	toolCalls?: ToolCall[];
	toolCallId?: string;
};

export type ToolParameter = {
	type: string;
	properties?: Record<string, unknown>;
	required?: string[];
};

export type Tool = {
	name: string;
	description: string;
	parameters: ToolParameter;
};

export type GenerateOptions = {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	systemPrompt?: string;
};

export type LLMEvent = { type: "text"; delta: string } | { type: "toolCall"; toolCall: ToolCall };

export interface LLMProvider {
	generate(messages: Message[], tools: Tool[], options?: GenerateOptions): AsyncIterable<LLMEvent>;
}
