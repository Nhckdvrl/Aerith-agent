export type HighlightCell = {
	text: string;
	style: string;
};

const KEYWORDS = new Set([
	"const",
	"let",
	"var",
	"function",
	"return",
	"if",
	"else",
	"for",
	"while",
	"import",
	"export",
	"from",
	"class",
	"async",
	"await",
	"try",
	"catch",
	"new",
	"this",
	"true",
	"false",
	"null",
	"undefined",
	"type",
	"interface",
	"extends",
	"implements",
	"static",
	"public",
	"private",
	"protected",
]);

const NUMBER_REGEX = /^\d+(\.\d+)?/;
const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*/;

export function highlightLine(line: string): HighlightCell[] {
	const cells: HighlightCell[] = [];
	let i = 0;
	while (i < line.length) {
		const char = line[i];

		if (char === " ") {
			cells.push({ text: " ", style: "" });
			i++;
			continue;
		}

		if (char === '"' || char === "'" || char === "`") {
			const quote = char;
			let j = i + 1;
			while (j < line.length && line[j] !== quote) {
				if (line[j] === "\\" && j + 1 < line.length) {
					j += 2;
				} else {
					j++;
				}
			}
			if (line[j] === quote) {
				j++;
			}
			cells.push({ text: line.slice(i, j), style: "\u001b[32m" });
			i = j;
			continue;
		}

		if (char === "/" && line[i + 1] === "/") {
			cells.push({ text: line.slice(i), style: "\u001b[90m" });
			break;
		}

		const numberMatch = NUMBER_REGEX.exec(line.slice(i));
		if (numberMatch) {
			const token = numberMatch[0];
			cells.push({ text: token, style: "\u001b[33m" });
			i += token.length;
			continue;
		}

		const identifierMatch = IDENTIFIER_REGEX.exec(line.slice(i));
		if (identifierMatch) {
			const token = identifierMatch[0];
			const style = KEYWORDS.has(token) ? "\u001b[35m" : "";
			cells.push({ text: token, style });
			i += token.length;
			continue;
		}

		cells.push({ text: char, style: "" });
		i++;
	}
	return cells;
}
