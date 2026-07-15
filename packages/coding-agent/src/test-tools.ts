import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Agent, createBuiltinTools } from "@aerith/agent";
import { FauxProvider } from "@aerith/ai";

async function run(): Promise<void> {
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "aerith-tools-test-"));
	await fs.mkdir(path.join(cwd, "src"));
	await fs.writeFile(path.join(cwd, "src", "index.ts"), "export const foo = 1;\n", "utf8");
	await fs.writeFile(path.join(cwd, "README.md"), "# Test\n", "utf8");

	const provider = new FauxProvider({
		responses: [
			[
				{
					type: "toolCall",
					toolCall: {
						id: "call-1",
						name: "list_dir",
						arguments: JSON.stringify({ path: ".", recursive: true }),
					},
				},
			],
			[{ type: "text", content: "Listed files" }],
			[
				{
					type: "toolCall",
					toolCall: {
						id: "call-2",
						name: "grep",
						arguments: JSON.stringify({ path: ".", pattern: "export const", file_pattern: "*.ts" }),
					},
				},
			],
			[{ type: "text", content: "Found export" }],
		],
	});

	const tools = createBuiltinTools({ cwd, allowWrite: true, allowBash: true });
	const agent = new Agent({ provider, tools, systemPrompt: "Test agent." });

	const listResult = await agent.run("List all files recursively");
	if (!listResult.text.includes("Listed files")) {
		throw new Error(`Unexpected list response: ${listResult.text}`);
	}
	const listToolResult = listResult.messages.find((m) => m.role === "tool" && m.toolCallId === "call-1")?.content;
	if (typeof listToolResult !== "string" || !listToolResult.includes("src/index.ts")) {
		throw new Error(`list_dir did not include src/index.ts: ${listToolResult}`);
	}

	const grepResult = await agent.run("Find 'export const' in ts files", { messages: listResult.messages });
	if (!grepResult.text.includes("Found export")) {
		throw new Error(`Unexpected grep response: ${grepResult.text}`);
	}
	const toolResult = grepResult.messages.find((m) => m.role === "tool" && m.toolCallId === "call-2")?.content;
	if (typeof toolResult !== "string" || !toolResult.includes("export const")) {
		throw new Error("grep tool did not return the match");
	}

	console.log("Explore tools test passed.");
}

run().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
