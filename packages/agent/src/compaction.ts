import type { Message } from "@aerith/ai";

export const DEFAULT_MAX_CONTEXT_TOKENS = 16000;

export type CompactionOptions = {
	maxTokens?: number;
	keepRecentMessages?: number;
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

export function compact(messages: Message[], options: CompactionOptions = {}): Message[] {
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
	const summary = createSummary(older);
	return [summary, ...recent];
}

function createSummary(older: Message[]): Message {
	const count = older.length;
	const text = `Earlier conversation (${count} messages) summarized: the assistant and user exchanged messages and tool results leading to the current request.`;
	return { role: "assistant", content: text };
}
