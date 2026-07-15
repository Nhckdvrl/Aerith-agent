import type { LLMProvider, Message, Tool } from "@aerith/ai";
import type { CompactionOptions } from "./compaction.ts";

export type { LLMProvider };

export type ToolPermissions = {
	write?: boolean;
	bash?: boolean;
	network?: boolean;
};

export type ToolDefinition = {
	schema: Tool;
	execute: (args: string) => Promise<string>;
	permissions?: ToolPermissions;
};

export type AgentOptions = {
	provider: LLMProvider;
	systemPrompt?: string;
	maxIterations?: number;
	compaction?: CompactionOptions;
	tools?: Map<string, ToolDefinition>;
	onTextDelta?: (delta: string) => void;
};

export type AgentRunOptions = {
	messages?: Message[];
	onTextDelta?: (delta: string) => void;
};

export type AgentRunResult = {
	messages: Message[];
	text: string;
};
