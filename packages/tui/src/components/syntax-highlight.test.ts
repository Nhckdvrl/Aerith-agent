import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { highlightLine } from "./syntax-highlight.ts";

describe("syntax-highlight", () => {
	it("highlights keywords", () => {
		const cells = highlightLine("const x = 1;");
		assert.equal(cells[0].text, "const");
		assert.equal(cells[0].style, "\u001b[35m");
	});

	it("highlights strings", () => {
		const cells = highlightLine('const s = "hello";');
		const stringCell = cells.find((c) => c.text === '"hello"');
		assert.ok(stringCell);
		assert.equal(stringCell.style, "\u001b[32m");
	});

	it("highlights numbers", () => {
		const cells = highlightLine("const x = 42;");
		const numberCell = cells.find((c) => c.text === "42");
		assert.ok(numberCell);
		assert.equal(numberCell.style, "\u001b[33m");
	});

	it("highlights comments", () => {
		const cells = highlightLine("// comment");
		assert.equal(cells.length, 1);
		assert.equal(cells[0].style, "\u001b[90m");
	});
});
