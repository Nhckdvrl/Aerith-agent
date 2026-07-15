import { OpenAIProvider } from "../openai.ts";

export type KimiProviderOptions = {
	apiKey?: string;
	baseURL?: string;
	defaultModel?: string;
};

export class KimiProvider extends OpenAIProvider {
	constructor(options: KimiProviderOptions = {}) {
		const model = options.defaultModel ?? "kimi-k2.7-code";
		const baseURL =
			options.baseURL ??
			(model === "kimi-for-coding" ? "https://api.kimi.com/coding/v1" : "https://api.moonshot.cn/v1");
		super({
			apiKey: options.apiKey ?? process.env.KIMI_CODE_API_KEY ?? process.env.MOONSHOT_API_KEY,
			baseURL,
			defaultModel: model,
		});
	}
}
