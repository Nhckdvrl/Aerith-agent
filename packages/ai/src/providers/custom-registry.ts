import type { LLMProvider } from "../types.ts";

export type ProviderFactory = (options: { apiKey?: string; baseURL?: string; model?: string }) => LLMProvider;

const registry = new Map<string, ProviderFactory>();

export const ProviderRegistry = {
	register(name: string, factory: ProviderFactory): void {
		registry.set(name, factory);
	},
	get(name: string): ProviderFactory | undefined {
		return registry.get(name);
	},
	list(): string[] {
		return Array.from(registry.keys());
	},
	clear(): void {
		registry.clear();
	},
} as const;
