import { createBuiltinTools } from "@aerith/agent";
import { createProvider } from "@aerith/ai";

const apiKey = process.env.KIMI_CODE_API_KEY || process.env.MOONSHOT_API_KEY;
if (!apiKey) {
	console.error("Missing API key");
	process.exit(1);
}

const provider = createProvider({ provider: "kimi", apiKey, model: "kimi-for-coding" });
const tools = createBuiltinTools({ cwd: "/home/xiang/Aerith-agent", allowWrite: true, allowBash: true });
const toolSchemas = Array.from(tools.values()).map((t) => t.schema);
const systemPrompt = "You are a helpful assistant with tools. Use tools only when needed.";

const messages = [{ role: "user", content: "Use list_dir to list files in the current directory" }];

async function main() {
	for (let i = 0; i < 3; i++) {
		console.log(`\n=== Iteration ${i} ===`);
		console.log("Messages sent to API:", JSON.stringify(messages, null, 2).slice(0, 2000));
		const events = provider.generate(messages, toolSchemas, { systemPrompt });
		let text = "";
		const toolCalls = [];
		for await (const event of events) {
			if (event.type === "text") text += event.delta;
			if (event.type === "toolCall") toolCalls.push(event.toolCall);
		}
		console.log("Assistant text:", text);
		console.log("Tool calls:", JSON.stringify(toolCalls, null, 2));
		messages.push({ role: "assistant", content: text, toolCalls });
		if (toolCalls.length === 0) break;
		for (const tc of toolCalls) {
			const definition = tools.get(tc.name);
			if (!definition) {
				console.log("Unknown tool:", tc.name);
				continue;
			}
			const result = await definition.execute(tc.arguments);
			console.log(`Tool ${tc.name} result:`, result.slice(0, 200));
			messages.push({ role: "tool", content: result, toolCallId: tc.id });
		}
	}
}

main().catch(console.error);
