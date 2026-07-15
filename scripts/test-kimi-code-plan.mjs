#!/usr/bin/env node
import OpenAI from "openai";

const apiKey = process.env.KIMI_CODE_API_KEY || process.env.MOONSHOT_API_KEY;
if (!apiKey) {
	console.error("Please set KIMI_CODE_API_KEY or MOONSHOT_API_KEY");
	process.exit(1);
}

const baseURL = process.env.KIMI_CODE_BASE_URL || "https://api.kimi.com/coding/v1";
const model = process.env.KIMI_CODE_MODEL || "kimi-for-coding";

const client = new OpenAI({ apiKey, baseURL });

async function main() {
	console.log(`Testing Kimi Code Plan API at ${baseURL} with model ${model}`);
	try {
		const stream = await client.chat.completions.create({
			model,
			messages: [{ role: "user", content: "Hello, this is a test. Please respond with a short greeting." }],
			stream: true,
		});
		let text = "";
		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta?.content;
			if (delta) {
				process.stdout.write(delta);
				text += delta;
			}
		}
		console.log("\n---");
		console.log(`Total response length: ${text.length} chars`);
		console.log("Kimi Code Plan API streaming test passed.");
	} catch (error) {
		console.error("\nTest failed:", error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

main();
