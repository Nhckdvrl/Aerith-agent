import { OpenAIProvider } from "../openai.ts";

export type KimiProviderOptions = {
	apiKey?: string;
	baseURL?: string;
	defaultModel?: string;
};

export class KimiProvider extends OpenAIProvider {
	constructor(options: KimiProviderOptions = {}) {
		super({
			apiKey: options.apiKey ?? process.env.MOONSHOT_API_KEY,
			baseURL: options.baseURL ?? "https://api.moonshot.cn/v1",
			defaultModel: options.defaultModel ?? "kimi-k2.7-code",
		});
	}
}
