import { createProvider } from "./src/providers/factory.ts";

const apiKey = process.env.KIMI_CODE_API_KEY || process.env.MOONSHOT_API_KEY;
if (!apiKey) {
	console.error("Please set KIMI_CODE_API_KEY or MOONSHOT_API_KEY");
	process.exit(1);
}

const provider = createProvider({
	provider: "kimi",
	apiKey,
	model: "kimi-for-coding",
});

async function main() {
	console.log("Testing Aerith KimiProvider via createProvider...");
	const events = provider.generate([{ role: "user", content: "Hello, please give a short greeting." }], []);
	let text = "";
	for await (const event of events) {
		if (event.type === "text") {
			process.stdout.write(event.delta);
			text += event.delta;
		}
	}
	console.log("\n---");
	console.log(`Total response length: ${text.length} chars`);
	console.log("Aerith KimiProvider test passed.");
}

main().catch((error) => {
	console.error("Test failed:", error instanceof Error ? error.message : String(error));
	process.exit(1);
});
