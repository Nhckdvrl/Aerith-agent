import { ModelRegistry, type ProviderName } from "../model-registry.ts";
import { OpenAIProvider } from "../openai.ts";
import type { LLMProvider } from "../types.ts";
import { AnthropicProvider } from "./anthropic.ts";
import { ProviderRegistry } from "./custom-registry.ts";
import { GoogleProvider } from "./google.ts";
import { KimiProvider } from "./kimi.ts";

export type ProviderFactoryOptions = {
	provider?: ProviderName | string;
	apiKey?: string;
	baseURL?: string;
	model?: string;
	registry?: ModelRegistry;
};

export function createProvider(options: ProviderFactoryOptions): LLMProvider {
	const registry = options.registry ?? new ModelRegistry();
	let providerName: ProviderName | string | undefined = options.provider;
	let modelId = options.model;

	if (modelId?.includes("/")) {
		const [providerFromModel, modelName] = splitModel(modelId);
		providerName = providerFromModel;
		modelId = modelName;
	}

	const modelInfo = modelId ? registry.findById(modelId) : undefined;
	if (modelInfo) {
		providerName = modelInfo.provider;
	}

	const resolvedProvider = (providerName ?? "openai") as ProviderName | string;
	const resolvedModel = modelId ?? modelInfo?.id;

	const customFactory = ProviderRegistry.get(resolvedProvider);
	if (customFactory) {
		return customFactory({ apiKey: options.apiKey, baseURL: options.baseURL, model: resolvedModel });
	}

	switch (resolvedProvider as ProviderName) {
		case "kimi":
		case "moonshot":
			return new KimiProvider({
				apiKey: options.apiKey,
				baseURL: options.baseURL,
				defaultModel: resolvedModel,
			});
		case "anthropic":
			return new AnthropicProvider({
				apiKey: options.apiKey,
				defaultModel: resolvedModel,
			});
		case "google":
			return new GoogleProvider({
				apiKey: options.apiKey,
				defaultModel: resolvedModel,
			});
		default:
			return new OpenAIProvider({
				apiKey: options.apiKey,
				baseURL: options.baseURL,
				defaultModel: resolvedModel,
			});
	}
}

function splitModel(model: string): [string, string] {
	const separatorIndex = model.indexOf("/");
	if (separatorIndex === -1) {
		return ["openai", model];
	}
	return [model.slice(0, separatorIndex), model.slice(separatorIndex + 1)];
}

export { ModelRegistry };
