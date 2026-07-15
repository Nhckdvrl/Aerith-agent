import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { Config } from "./settings.ts";

export function shouldRunFirstTimeSetup(): boolean {
	return !existsSync(path.join(homedir(), ".aerith", "config.json"));
}

export async function runFirstTimeSetup(): Promise<Config> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });

	function ask(question: string): Promise<string> {
		return new Promise((resolve) => {
			rl.question(question, (answer) => resolve(answer.trim()));
		});
	}

	function askYesNo(question: string, defaultValue: boolean): Promise<boolean> {
		const suffix = defaultValue ? " [Y/n]" : " [y/N]";
		return new Promise((resolve) => {
			rl.question(`${question}${suffix} `, (answer) => {
				const trimmed = answer.trim().toLowerCase();
				if (!trimmed) {
					resolve(defaultValue);
					return;
				}
				resolve(trimmed === "y" || trimmed === "yes");
			});
		});
	}

	try {
		console.log("欢迎使用 Aerith。请先完成首次设置。\n");

		const providerInput = await ask("选择 provider（openai / kimi，默认 kimi）: ");
		const provider = providerInput === "openai" ? "openai" : "kimi";

		const apiKeyPrompt = provider === "openai" ? "输入 OpenAI API Key: " : "输入 Moonshot API Key: ";
		const apiKey = await ask(apiKeyPrompt);

		const defaultModel = provider === "openai" ? "gpt-4o-mini" : "kimi-k2.7-code";
		const modelInput = await ask(`模型名称（默认 ${defaultModel}）: `);
		const model = modelInput ? `${provider}/${modelInput}` : `${provider}/${defaultModel}`;

		const defaultBaseURL = provider === "openai" ? "https://api.openai.com/v1" : "https://api.moonshot.cn/v1";
		const baseURLInput = await ask(`API Base URL（默认 ${defaultBaseURL}）: `);
		const baseURL = baseURLInput || defaultBaseURL;

		const allowWrite = await askYesNo("是否默认允许写入文件工具", false);
		const allowBash = await askYesNo("是否默认允许运行 shell 命令", false);

		const config: Config = {
			model,
			apiKey,
			baseURL,
			allowWrite,
			allowBash,
		};

		const { SettingsManager } = await import("./settings.ts");
		await SettingsManager.saveGlobalConfig(config);
		console.log("\n配置已保存到 ~/.aerith/config.json\n");

		return config;
	} finally {
		rl.close();
	}
}
