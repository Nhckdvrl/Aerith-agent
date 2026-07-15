import { Agent, createBuiltinTools } from "@aerith/agent";
import { createProvider } from "@aerith/ai";

const apiKey = process.env.KIMI_CODE_API_KEY || process.env.MOONSHOT_API_KEY;
if (!apiKey) {
	console.error("Missing API key");
	process.exit(1);
}

const provider = createProvider({ provider: "kimi", apiKey, model: "kimi-for-coding" });
const tools = createBuiltinTools({ cwd: "/home/xiang/Aerith-agent", allowWrite: true, allowBash: true });

const agent = new Agent({
	provider,
	systemPrompt: "You are a helpful assistant with tools. Use tools only when needed.",
	tools,
	maxIterations: 5,
});

async function main() {
	const result = await agent.run("Call the hello tool with name=test");
	console.log("--- Final text ---");
	console.log(result.text);
	console.log("--- Messages ---");
	for (const msg of result.messages) {
		console.log(JSON.stringify({ role: msg.role, content: msg.content, toolCalls: msg.toolCalls, toolCallId: msg.toolCallId }, null, 2));
	}
}

main().catch(console.error);
