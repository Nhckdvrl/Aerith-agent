import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Agent, createBuiltinTools } from "@aerith/agent";
import { FauxProvider } from "@aerith/ai";

async function run(): Promise<void> {
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "aerith-test-"));
	const provider = new FauxProvider({
		responses: [
			[
				{
					type: "toolCall",
					toolCall: {
						id: "call-1",
						name: "write_file",
						arguments: JSON.stringify({ path: "hello.txt", content: "hello world" }),
					},
				},
			],
			[
				{
					type: "toolCall",
					toolCall: {
						id: "call-2",
						name: "read_file",
						arguments: JSON.stringify({ path: "hello.txt" }),
					},
				},
			],
			[{ type: "text", content: "Verified: file contains 'hello world'" }],
		],
	});

	const tools = createBuiltinTools({ cwd, allowWrite: true, allowBash: true });
	const agent = new Agent({ provider, tools, systemPrompt: "You are a test agent." });
	const result = await agent.run("Create hello.txt with 'hello world' then read it.");

	if (!result.text.includes("hello world")) {
		throw new Error(`Unexpected final response: ${result.text}`);
	}

	const written = await fs.readFile(path.join(cwd, "hello.txt"), "utf8");
	if (written !== "hello world") {
		throw new Error(`File content mismatch: ${written}`);
	}

	console.log("Local mock test passed.");
}

run().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
