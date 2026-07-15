import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProcessTerminal } from "../terminal.ts";

describe("ProcessTerminal key parsing", () => {
	it("parses pageup", () => {
		const events: { key: string; ctrl: boolean }[] = [];
		const terminal = new ProcessTerminal();
		terminal.onKey((event) => events.push({ key: event.key, ctrl: event.ctrl }));
		// Simulate ESC [ 5 ~
		const stdin = process.stdin;
		stdin.emit("data", Buffer.from("\u001b[5~"));
		assert.equal(events.length, 1);
		assert.equal(events[0].key, "pageup");
	});

	it("parses pagedown", () => {
		const events: { key: string; ctrl: boolean }[] = [];
		const terminal = new ProcessTerminal();
		terminal.onKey((event) => events.push({ key: event.key, ctrl: event.ctrl }));
		process.stdin.emit("data", Buffer.from("\u001b[6~"));
		assert.equal(events.length, 1);
		assert.equal(events[0].key, "pagedown");
	});
});
