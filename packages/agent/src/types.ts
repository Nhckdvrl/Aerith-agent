import type { LLMProvider, Message, Tool } from "@aerith/ai";

export type { LLMProvider };

export type ToolDefinition = {
	schema: Tool;
	execute: (args: string) => Promise<string>;
};

export type AgentOptions = {
	provider: LLMProvider;
	systemPrompt?: string;
	maxIterations?: number;
	tools?: Map<string, ToolDefinition>;
};

export type AgentRunResult = {
	messages: Message[];
	text: string;
};
