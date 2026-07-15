import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LLMEvent, LLMProvider, Message, Tool } from "@aerith/ai";
import { compact, estimateTokens } from "./compaction.ts";

describe("compaction", () => {
	it("returns messages unchanged when under token limit", async () => {
		const messages: Message[] = [
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi" },
		];
		const result = await compact(messages, { maxTokens: 100000 });
		assert.deepEqual(result, messages);
	});

	it("keeps recent messages and replaces older with a simple summary", async () => {
		const messages: Message[] = [
			{ role: "user", content: "message 1" },
			{ role: "assistant", content: "message 2" },
			{ role: "user", content: "message 3" },
			{ role: "assistant", content: "message 4" },
			{ role: "user", content: "message 5" },
		];
		const result = await compact(messages, { maxTokens: 1, keepRecentMessages: 2 });
		assert.equal(result.length, 3);
		assert.equal(result[0].role, "assistant");
		assert.ok(typeof result[0].content === "string" && result[0].content.includes("3 messages"));
		assert.equal(result[1].content, "message 4");
		assert.equal(result[2].content, "message 5");
	});

	it("uses LLM to summarize when provider is provided", async () => {
		const messages: Message[] = [
			{ role: "user", content: "Please refactor the login module." },
			{ role: "assistant", content: "I will refactor the login module." },
			{ role: "user", content: "Also update tests." },
			{ role: "assistant", content: "I will update the tests." },
			{ role: "user", content: "What is the weather?" },
		];

		const fakeProvider: LLMProvider = {
			async *generate(): AsyncIterable<LLMEvent> {
				yield { type: "text", delta: "User asked to refactor login and update tests." };
			},
		};

		const result = await compact(messages, {
			maxTokens: 1,
			keepRecentMessages: 1,
			provider: fakeProvider,
		});

		assert.equal(result.length, 2);
		assert.equal(result[0].role, "assistant");
		assert.ok(
			typeof result[0].content === "string" &&
				result[0].content.includes("User asked to refactor login and update tests"),
		);
		assert.equal(result[1].content, "What is the weather?");
	});
});

describe("estimateTokens", () => {
	it("estimates based on character count", () => {
		const message: Message = { role: "user", content: "hello" };
		assert.equal(estimateTokens(message), 2); // ceil(5 / 4)
	});
});
