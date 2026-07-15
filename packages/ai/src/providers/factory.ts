import { OpenAIProvider } from "../openai.ts";
import type { LLMProvider } from "../types.ts";

export type KnownProvider = "openai" | "kimi" | "moonshot" | "openai-compatible";

export type ProviderFactoryOptions = {
	provider?: KnownProvider | string;
	apiKey?: string;
	baseURL?: string;
	model?: string;
};

export function createProvider(options: ProviderFactoryOptions): LLMProvider {
	let providerName = options.provider ?? "openai";
	let model = options.model;

	if (model?.includes("/")) {
		const [providerFromModel, modelName] = splitModel(model);
		providerName = providerFromModel;
		model = modelName;
	}

	const apiKey = options.apiKey ?? resolveApiKey(providerName);

	switch (providerName) {
		case "kimi":
		case "moonshot":
			return new OpenAIProvider({
				apiKey,
				baseURL: options.baseURL ?? "https://api.moonshot.cn/v1",
				defaultModel: model ?? "kimi-k2.7-code",
			});
		default:
			return new OpenAIProvider({
				apiKey,
				baseURL: options.baseURL,
				defaultModel: model ?? "gpt-4o-mini",
			});
	}
}

function resolveApiKey(providerName: string): string | undefined {
	switch (providerName) {
		case "kimi":
		case "moonshot":
			return process.env.MOONSHOT_API_KEY;
		default:
			return process.env.OPENAI_API_KEY;
	}
}

function splitModel(model: string): [string, string] {
	const separatorIndex = model.indexOf("/");
	if (separatorIndex === -1) {
		return ["openai", model];
	}
	return [model.slice(0, separatorIndex), model.slice(separatorIndex + 1)];
}
