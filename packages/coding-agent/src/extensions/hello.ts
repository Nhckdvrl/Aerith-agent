import type { Extension, ExtensionContext } from "@aerith/agent";

export const helloExtension: Extension = {
	name: "hello",
	version: "0.1.0",
	activate(context: ExtensionContext): void {
		context.registerTool("hello", {
			schema: {
				name: "hello",
				description: "Greet someone by name. Returns a friendly greeting.",
				parameters: {
					type: "object",
					properties: {
						name: { type: "string", description: "Name to greet." },
					},
					required: ["name"],
				},
			},
			execute: async (args) => {
				const parsed = JSON.parse(args) as { name?: string };
				return `Hello, ${parsed.name ?? "world"}! This tool was provided by the hello extension.`;
			},
		});
	},
};
