import { ProviderRegistry } from "@aerith/ai";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ToolDefinition } from "../types.ts";
import type { Extension, ExtensionContext, ProviderFactory } from "./types.ts";

export type ExtensionManagerOptions = {
	cwd: string;
	settings?: Record<string, unknown>;
};

export class ExtensionManager {
	private readonly context: ExtensionContext;
	private readonly extensions: Extension[] = [];
	private readonly tools = new Map<string, ToolDefinition>();
	private readonly providers = new Map<string, ProviderFactory>();

	constructor(options: ExtensionManagerOptions) {
		this.context = {
			cwd: options.cwd,
			settings: options.settings ?? {},
			registerTool: (name, tool) => {
				this.tools.set(name, tool);
			},
			registerProvider: (name, factory) => {
				this.providers.set(name, factory);
				ProviderRegistry.register(name, factory);
			},
		};
	}

	async loadBuiltIn(extensions: Extension[]): Promise<void> {
		for (const extension of extensions) {
			await this.activate(extension);
		}
	}

	async loadFromDirectory(dir: string): Promise<void> {
		if (!existsSync(dir)) {
			return;
		}
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const path = join(dir, entry.name);
			if (entry.isFile() && path.endsWith(".js")) {
				await this.loadFromFile(path);
			}
		}
	}

	private async loadFromFile(path: string): Promise<void> {
		const module = await import(pathToFileURL(path).href);
		const extension: Extension = module.default ?? module;
		if (isExtension(extension)) {
			await this.activate(extension);
		}
	}

	private async activate(extension: Extension): Promise<void> {
		await extension.activate(this.context);
		this.extensions.push(extension);
	}

	getTools(): Map<string, ToolDefinition> {
		return this.tools;
	}

	getProviders(): Map<string, ProviderFactory> {
		return this.providers;
	}

	getExtensions(): Extension[] {
		return [...this.extensions];
	}
}

function isExtension(value: unknown): value is Extension {
	return (
		typeof value === "object" &&
		value !== null &&
		"name" in value &&
		typeof (value as { name?: unknown }).name === "string" &&
		"activate" in value &&
		typeof (value as { activate?: unknown }).activate === "function"
	);
}
