import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type Config = {
	model?: string;
	apiKey?: string;
	baseURL?: string;
	allowWrite?: boolean;
	allowBash?: boolean;
	extensions?: Record<string, unknown>;
};

export type SettingsManagerOptions = {
	cwd: string;
	configPath?: string;
};

export class SettingsManager {
	private readonly config: Config;

	constructor(config: Config) {
		this.config = config;
	}

	static async create(options: SettingsManagerOptions): Promise<SettingsManager> {
		const globalConfig = options.configPath
			? await readConfigFile(options.configPath)
			: await readConfigFile(path.join(homedir(), ".aerith", "config.json"));
		const projectConfig = await readConfigFile(path.join(options.cwd, ".aerith", "config.json"));
		return new SettingsManager({ ...globalConfig, ...projectConfig });
	}

	getModel(): string | undefined {
		return this.config.model;
	}

	getApiKey(): string | undefined {
		return this.config.apiKey;
	}

	getBaseURL(): string | undefined {
		return this.config.baseURL;
	}

	getAllowWrite(): boolean | undefined {
		return this.config.allowWrite;
	}

	getAllowBash(): boolean | undefined {
		return this.config.allowBash;
	}

	getExtensionSettings(): Record<string, unknown> {
		return this.config.extensions ?? {};
	}

	static async saveGlobalConfig(config: Config): Promise<void> {
		const filePath = path.join(homedir(), ".aerith", "config.json");
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf8");
	}
}

async function readConfigFile(filePath: string): Promise<Config> {
	try {
		const content = await fs.readFile(filePath, "utf8");
		return JSON.parse(content) as Config;
	} catch {
		return {};
	}
}
