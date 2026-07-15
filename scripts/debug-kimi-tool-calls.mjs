import OpenAI from "openai";

const apiKey = process.env.KIMI_CODE_API_KEY || process.env.MOONSHOT_API_KEY;
if (!apiKey) {
	console.error("Please set KIMI_CODE_API_KEY");
	process.exit(1);
}

const client = new OpenAI({ apiKey, baseURL: "https://api.kimi.com/coding/v1" });

async function main() {
	const stream = await client.chat.completions.create({
		model: "kimi-for-coding",
		messages: [{ role: "user", content: "Use the read_file tool to read package.json and tell me its name." }],
		tools: [
			{
				type: "function",
				function: {
					name: "read_file",
					description: "Read a file",
					parameters: {
						type: "object",
						properties: { path: { type: "string" } },
						required: ["path"],
					},
				},
			},
		],
		stream: true,
	});

	for await (const chunk of stream) {
		const delta = chunk.choices[0]?.delta;
		if (delta?.tool_calls) {
			console.log("tool_calls chunk:", JSON.stringify(delta.tool_calls, null, 2));
		}
		if (chunk.choices[0]?.finish_reason) {
			console.log("finish_reason:", chunk.choices[0].finish_reason);
		}
	}
}

main().catch(console.error);
