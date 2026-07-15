import type { GenerateOptions, LLMEvent, LLMProvider, Message, Tool } from "../types.ts";

export type FauxResponse =
	| { type: "text"; content: string }
	| { type: "toolCall"; toolCall: { id: string; name: string; arguments: string } };

export type FauxProviderOptions = {
	responses: FauxResponse[][];
	defaultModel?: string;
};

export class FauxProvider implements LLMProvider {
	private readonly responses: FauxResponse[][];
	private readonly defaultModel: string;
	private callIndex = 0;

	constructor(options: FauxProviderOptions) {
		this.responses = options.responses;
		this.defaultModel = options.defaultModel ?? "faux";
	}

	async *generate(_messages: Message[], _tools: Tool[], options: GenerateOptions = {}): AsyncIterable<LLMEvent> {
		const _model = options.model ?? this.defaultModel;
		const response = this.responses[this.callIndex++] ?? [{ type: "text", content: "(no more faux responses)" }];
		for (const item of response) {
			if (item.type === "text") {
				yield { type: "text", delta: item.content };
			} else {
				yield { type: "toolCall", toolCall: item.toolCall };
			}
		}
	}
}
