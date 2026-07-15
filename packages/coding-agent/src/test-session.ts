import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Agent, createBuiltinTools, SessionManager } from "@aerith/agent";
import { FauxProvider } from "@aerith/ai";

async function run(): Promise<void> {
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "aerith-session-test-"));
	const provider = new FauxProvider({
		responses: [
			[
				{
					type: "toolCall",
					toolCall: {
						id: "call-1",
						name: "write_file",
						arguments: JSON.stringify({ path: "note.txt", content: "persisted" }),
					},
				},
			],
			[{ type: "text", content: "Created note.txt" }],
			[
				{
					type: "toolCall",
					toolCall: {
						id: "call-2",
						name: "read_file",
						arguments: JSON.stringify({ path: "note.txt" }),
					},
				},
			],
			[{ type: "text", content: "Read back: persisted" }],
		],
	});

	const tools = createBuiltinTools({ cwd, allowWrite: true });
	const agent = new Agent({ provider, tools, systemPrompt: "Test agent." });

	const first = await agent.run("Create note.txt");
	if (!first.text.includes("Created")) {
		throw new Error(`Unexpected first response: ${first.text}`);
	}

	const sessionManager = await SessionManager.create(cwd, { name: "test" });
	sessionManager.setMessages(first.messages);
	await sessionManager.save();

	const reopened = await SessionManager.open(sessionManager.getInfo().path);
	const second = await agent.run("Read it back", { messages: reopened.getMessages() });
	if (!second.text.includes("Read back")) {
		throw new Error(`Unexpected second response: ${second.text}`);
	}

	reopened.setMessages(second.messages);
	await reopened.save();

	const finalData = await fs.readFile(sessionManager.getInfo().path, "utf8");
	const parsed = JSON.parse(finalData) as { messages: unknown[]; name: string };
	if (parsed.messages.length !== 8) {
		throw new Error(`Expected 8 messages, got ${parsed.messages.length}`);
	}
	if (parsed.name !== "test") {
		throw new Error(`Session name mismatch: ${parsed.name}`);
	}

	console.log("Session persistence test passed.");
}

run().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
