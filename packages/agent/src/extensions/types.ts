import type { LLMProvider } from "@aerith/ai";
import type { ToolDefinition } from "../types.ts";

export type ProviderFactory = (options: {
	apiKey?: string;
	baseURL?: string;
	model?: string;
}) => LLMProvider;

export type ExtensionContext = {
	registerTool(name: string, tool: ToolDefinition): void;
	registerProvider(name: string, factory: ProviderFactory): void;
	readonly cwd: string;
	readonly settings: Record<string, unknown>;
};

export type Extension = {
	name: string;
	version?: string;
	activate(context: ExtensionContext): void | Promise<void>;
	deactivate?(): void | Promise<void>;
};
