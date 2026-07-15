import type { LLMProvider, Message } from "@aerith/ai";

export const DEFAULT_MAX_CONTEXT_TOKENS = 16000;

export type CompactionOptions = {
	maxTokens?: number;
	keepRecentMessages?: number;
	provider?: LLMProvider;
	systemPrompt?: string;
};

export function estimateTokens(message: Message): number {
	const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
	const toolCalls = message.toolCalls ? JSON.stringify(message.toolCalls) : "";
	const text = `${content}${toolCalls}`;
	return Math.ceil(text.length / 4);
}

export function estimateContextTokens(messages: Message[]): number {
	return messages.reduce((sum, message) => sum + estimateTokens(message), 0);
}

export async function compact(messages: Message[], options: CompactionOptions = {}): Promise<Message[]> {
	const maxTokens = options.maxTokens ?? DEFAULT_MAX_CONTEXT_TOKENS;
	const keepRecent = options.keepRecentMessages ?? 8;

	if (messages.length <= keepRecent) {
		return messages;
	}

	const totalTokens = estimateContextTokens(messages);
	if (totalTokens <= maxTokens) {
		return messages;
	}

	const recent = messages.slice(-keepRecent);
	const older = messages.slice(0, -keepRecent);

	if (options.provider) {
		const summary = await summarizeWithLLM(older, options.provider, options.systemPrompt);
		return [summary, ...recent];
	}

	const summary = createSummary(older);
	return [summary, ...recent];
}

function createSummary(older: Message[]): Message {
	const count = older.length;
	const text = `Earlier conversation (${count} messages) summarized: the assistant and user exchanged messages and tool results leading to the current request.`;
	return { role: "assistant", content: text };
}

async function summarizeWithLLM(older: Message[], provider: LLMProvider, systemPrompt?: string): Promise<Message> {
	const prompt = `Summarize the following conversation history into a concise paragraph. Preserve key facts, user goals, decisions made, and important tool results. Do not include the current request.`;
	const messages: Message[] = [{ role: "user", content: `${prompt}\n\n${formatMessages(older)}` }];

	let text = "";
	const events = provider.generate(messages, [], { systemPrompt });
	for await (const event of events) {
		if (event.type === "text") {
			text += event.delta;
		}
	}

	return { role: "assistant", content: `Earlier conversation summary: ${text}` };
}

function formatMessages(messages: Message[]): string {
	return messages
		.map((message) => {
			let line = `${message.role}: `;
			if (typeof message.content === "string") {
				line += message.content;
			} else {
				line += JSON.stringify(message.content);
			}
			if (message.toolCalls) {
				line += `\nTool calls: ${JSON.stringify(message.toolCalls)}`;
			}
			return line;
		})
		.join("\n\n");
}
