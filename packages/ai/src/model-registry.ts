export type ProviderName = "openai" | "anthropic" | "google" | "kimi" | "moonshot";

export type ModelInfo = {
	id: string;
	provider: ProviderName;
	name: string;
	description?: string;
	contextWindow?: number;
};

export const KNOWN_MODELS: ModelInfo[] = [
	{
		id: "gpt-4o-mini",
		provider: "openai",
		name: "GPT-4o mini",
		description: "OpenAI small fast model",
		contextWindow: 128000,
	},
	{ id: "gpt-4o", provider: "openai", name: "GPT-4o", description: "OpenAI flagship model", contextWindow: 128000 },
	{
		id: "claude-3-5-sonnet-latest",
		provider: "anthropic",
		name: "Claude 3.5 Sonnet",
		description: "Anthropic coding model",
		contextWindow: 200000,
	},
	{
		id: "claude-3-opus-latest",
		provider: "anthropic",
		name: "Claude 3 Opus",
		description: "Anthropic large model",
		contextWindow: 200000,
	},
	{
		id: "gemini-2.0-flash",
		provider: "google",
		name: "Gemini 2.0 Flash",
		description: "Google fast model",
		contextWindow: 1048576,
	},
	{
		id: "gemini-2.5-pro",
		provider: "google",
		name: "Gemini 2.5 Pro",
		description: "Google reasoning model",
		contextWindow: 1048576,
	},
	{
		id: "kimi-k2.7-code",
		provider: "kimi",
		name: "Kimi K2.7 Code",
		description: "Moonshot coding model",
		contextWindow: 256000,
	},
	{
		id: "kimi-k2.6",
		provider: "kimi",
		name: "Kimi K2.6",
		description: "Moonshot general model",
		contextWindow: 256000,
	},
];

export class ModelRegistry {
	private readonly models: Map<string, ModelInfo> = new Map();

	constructor(models: ModelInfo[] = KNOWN_MODELS) {
		for (const model of models) {
			this.models.set(model.id, model);
		}
	}

	findById(id: string): ModelInfo | undefined {
		return this.models.get(id);
	}

	findByProvider(provider: ProviderName): ModelInfo[] {
		return Array.from(this.models.values()).filter((m) => m.provider === provider);
	}

	search(pattern?: string): ModelInfo[] {
		const models = Array.from(this.models.values());
		if (!pattern) {
			return models;
		}
		const lower = pattern.toLowerCase();
		return models.filter(
			(m) =>
				m.id.toLowerCase().includes(lower) ||
				m.name.toLowerCase().includes(lower) ||
				(m.description?.toLowerCase().includes(lower) ?? false),
		);
	}

	list(): ModelInfo[] {
		return Array.from(this.models.values());
	}
}
