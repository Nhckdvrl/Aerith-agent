import { marked } from "marked";
import { highlightLine } from "./syntax-highlight.ts";

export type MarkdownCell = {
	text: string;
	style?: string;
};

export function renderMarkdownToLines(source: string, width: number): MarkdownCell[][] {
	const tokens = marked.lexer(source);
	const lines: MarkdownCell[][] = [];

	for (const token of tokens) {
		if (token.type === "paragraph") {
			const text = typeof token.text === "string" ? token.text : "";
			wrapLine(text, width, lines, "");
		} else if (token.type === "code") {
			const text = typeof token.text === "string" ? token.text : "";
			for (const line of text.split("\n")) {
				const cells = highlightLine(line);
				lines.push(cells.map((cell) => ({ text: cell.text, style: cell.style || "\u001b[48;5;236m" })));
			}
		} else if (token.type === "heading") {
			const text = typeof token.text === "string" ? token.text : "";
			wrapLine(text, width, lines, "\u001b[1m");
		} else if (token.type === "space") {
			lines.push([]);
		}
	}

	return lines;
}

function wrapLine(text: string, width: number, lines: MarkdownCell[][], style: string): void {
	let current = "";
	for (const char of text) {
		if (char === "\n") {
			lines.push([{ text: current, style }]);
			current = "";
			continue;
		}
		if (current.length >= width) {
			lines.push([{ text: current, style }]);
			current = char === " " ? "" : char;
		} else {
			current += char;
		}
	}
	if (current) {
		lines.push([{ text: current, style }]);
	}
}
