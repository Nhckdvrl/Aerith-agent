import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ProviderRegistry } from "@aerith/ai";
import type { ToolDefinition, ToolPermissions } from "../types.ts";
import type { Extension, ExtensionContext, ProviderFactory } from "./types.ts";

export type ExtensionManagerOptions = {
	cwd: string;
	settings?: Record<string, unknown>;
	allowedPermissions?: ToolPermissions;
	logger?: (message: string) => void;
};

export class ExtensionManager {
	private readonly context: ExtensionContext;
	private readonly extensions: Extension[] = [];
	private readonly tools = new Map<string, ToolDefinition>();
	private readonly providers = new Map<string, ProviderFactory>();
	private readonly allowedPermissions: ToolPermissions;
	private readonly logger: (message: string) => void;

	constructor(options: ExtensionManagerOptions) {
		this.allowedPermissions = options.allowedPermissions ?? {};
		this.logger = options.logger ?? (() => undefined);
		this.context = {
			cwd: options.cwd,
			settings: options.settings ?? {},
			registerTool: (name, tool) => {
				if (!hasPermission(tool.permissions, this.allowedPermissions)) {
					this.logger(
						`Extension tool "${name}" skipped: requires ${formatPermissions(tool.permissions)} permissions.`,
					);
					return;
				}
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
		try {
			const module = await import(pathToFileURL(path).href);
			const extension: Extension = module.default ?? module;
			if (isExtension(extension)) {
				await this.activate(extension);
			} else {
				this.logger(`Skipped ${path}: not a valid extension.`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger(`Failed to load extension ${path}: ${message}`);
		}
	}

	private async activate(extension: Extension): Promise<void> {
		try {
			if (!hasPermission(extension.permissions, this.allowedPermissions)) {
				this.logger(
					`Extension "${extension.name}" skipped: requires ${formatPermissions(extension.permissions)} permissions.`,
				);
				return;
			}
			await extension.activate(this.context);
			this.extensions.push(extension);
			this.logger(`Extension "${extension.name}" loaded.`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger(`Extension "${extension.name}" failed to activate: ${message}`);
		}
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

function hasPermission(required: ToolPermissions | undefined, allowed: ToolPermissions): boolean {
	if (!required) {
		return true;
	}
	if (required.write && !allowed.write) {
		return false;
	}
	if (required.bash && !allowed.bash) {
		return false;
	}
	if (required.network && !allowed.network) {
		return false;
	}
	return true;
}

function formatPermissions(permissions: ToolPermissions | undefined): string {
	if (!permissions) {
		return "none";
	}
	const list: string[] = [];
	if (permissions.write) list.push("write");
	if (permissions.bash) list.push("bash");
	if (permissions.network) list.push("network");
	return list.length === 0 ? "none" : list.join(", ");
}
