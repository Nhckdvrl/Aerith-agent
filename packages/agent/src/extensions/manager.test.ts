import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProviderRegistry } from "@aerith/ai";
import { ExtensionManager } from "./manager.ts";
import type { Extension } from "./types.ts";

describe("ExtensionManager", () => {
	it("loads a built-in extension that registers a tool", async () => {
		const extension: Extension = {
			name: "test-tool",
			activate(context) {
				context.registerTool("greet", {
					schema: {
						name: "greet",
						description: "Greet",
						parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
					},
					execute: async (args) => {
						const parsed = JSON.parse(args) as { name: string };
						return `Hello ${parsed.name}`;
					},
				});
			},
		};

		const manager = new ExtensionManager({ cwd: "/tmp" });
		await manager.loadBuiltIn([extension]);

		const tools = manager.getTools();
		assert.equal(tools.has("greet"), true);

		const result = await tools.get("greet")?.execute(JSON.stringify({ name: "Aerith" }));
		assert.equal(result, "Hello Aerith");
	});

	it("registers a custom provider", async () => {
		ProviderRegistry.clear();
		const extension: Extension = {
			name: "test-provider",
			activate(context) {
				context.registerProvider("custom", () => ({
					async *generate() {
						yield { type: "text" as const, delta: "ok" };
					},
				}));
			},
		};

		const manager = new ExtensionManager({ cwd: "/tmp" });
		await manager.loadBuiltIn([extension]);

		const providers = manager.getProviders();
		assert.equal(providers.has("custom"), true);
		assert.deepEqual(ProviderRegistry.list(), ["custom"]);
	});

	it("skips tools when permissions are not allowed", async () => {
		const extension: Extension = {
			name: "test-permission",
			activate(context) {
				context.registerTool("write", {
					schema: {
						name: "write",
						description: "Write",
						parameters: { type: "object", properties: {} },
					},
					execute: async () => "ok",
					permissions: { write: true },
				});
			},
		};

		const manager = new ExtensionManager({ cwd: "/tmp", allowedPermissions: {} });
		await manager.loadBuiltIn([extension]);

		assert.equal(manager.getTools().has("write"), false);
	});

	it("isolates extension activation errors", async () => {
		const goodExtension: Extension = {
			name: "good",
			activate(context) {
				context.registerTool("good-tool", {
					schema: {
						name: "good-tool",
						description: "Good",
						parameters: { type: "object", properties: {} },
					},
					execute: async () => "ok",
				});
			},
		};
		const badExtension: Extension = {
			name: "bad",
			activate() {
				throw new Error("boom");
			},
		};

		const manager = new ExtensionManager({ cwd: "/tmp" });
		await manager.loadBuiltIn([goodExtension, badExtension]);

		assert.equal(manager.getExtensions().length, 1);
		assert.equal(manager.getTools().has("good-tool"), true);
	});
});
