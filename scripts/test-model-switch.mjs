import { Agent, createBuiltinTools } from "@aerith/agent";
import { createProvider } from "@aerith/ai";

const apiKey = process.env.KIMI_CODE_API_KEY || process.env.MOONSHOT_API_KEY;
if (!apiKey) {
	console.error("Missing API key");
	process.exit(1);
}

const provider = createProvider({ provider: "kimi", apiKey, model: "kimi-for-coding" });
const tools = createBuiltinTools({ cwd: "/home/xiang/Aerith-agent", allowWrite: false, allowBash: false });
const agent = new Agent({ provider, systemPrompt: "You are a test assistant.", tools });

async function main() {
	const r1 = await agent.run("Say hello briefly");
	console.log("Model 1:", r1.text.trim());

	agent.setProvider(createProvider({ provider: "kimi", apiKey, model: "kimi-k2.6" }));
	const r2 = await agent.run("Say hi briefly");
	console.log("Model 2:", r2.text.trim());

	console.log("Model switching test passed.");
}

main().catch(console.error);
