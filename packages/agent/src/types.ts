import type { LLMProvider, Message, Tool } from "@aerith/ai";
import type { CompactionOptions } from "./compaction.ts";

export type { LLMProvider };

export type ToolDefinition = {
	schema: Tool;
	execute: (args: string) => Promise<string>;
};

export type AgentOptions = {
	provider: LLMProvider;
	systemPrompt?: string;
	maxIterations?: number;
	compaction?: CompactionOptions;
	tools?: Map<string, ToolDefinition>;
};

export type AgentRunResult = {
	messages: Message[];
	text: string;
};
