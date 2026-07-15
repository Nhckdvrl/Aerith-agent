import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderMarkdownToLines } from "./markdown.ts";

describe("renderMarkdownToLines", () => {
	it("renders paragraphs", () => {
		const lines = renderMarkdownToLines("Hello world", 80);
		assert.equal(lines.length, 1);
		assert.equal(lines[0][0].text, "Hello world");
	});

	it("renders code blocks with highlighting", () => {
		const source = "```typescript\nconst x = 1;\n```";
		const lines = renderMarkdownToLines(source, 80);
		assert.ok(lines.length >= 1);
		const line = lines[0];
		const keywordCell = line.find((cell) => cell.text === "const");
		assert.ok(keywordCell);
		assert.equal(keywordCell.style, "\u001b[35m");
	});

	it("renders headings bold", () => {
		const lines = renderMarkdownToLines("# Title", 80);
		assert.equal(lines[0][0].style, "\u001b[1m");
	});
});
