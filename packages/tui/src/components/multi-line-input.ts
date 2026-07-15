export type MultiLineInputState = {
	lines: string[];
	cursorRow: number;
	cursorCol: number;
};

export function createMultiLineInput(initial = ""): MultiLineInputState {
	const lines = initial.length > 0 ? initial.split("\n") : [""];
	return { lines, cursorRow: lines.length - 1, cursorCol: lines[lines.length - 1].length };
}

export function getText(state: MultiLineInputState): string {
	return state.lines.join("\n");
}

export function insertChar(state: MultiLineInputState, char: string): void {
	const line = state.lines[state.cursorRow] ?? "";
	state.lines[state.cursorRow] = line.slice(0, state.cursorCol) + char + line.slice(state.cursorCol);
	state.cursorCol++;
}

export function insertNewLine(state: MultiLineInputState): void {
	const line = state.lines[state.cursorRow] ?? "";
	const before = line.slice(0, state.cursorCol);
	const after = line.slice(state.cursorCol);
	state.lines[state.cursorRow] = before;
	state.lines.splice(state.cursorRow + 1, 0, after);
	state.cursorRow++;
	state.cursorCol = 0;
}

export function backspace(state: MultiLineInputState): void {
	const line = state.lines[state.cursorRow] ?? "";
	if (state.cursorCol > 0) {
		state.lines[state.cursorRow] = line.slice(0, state.cursorCol - 1) + line.slice(state.cursorCol);
		state.cursorCol--;
		return;
	}
	if (state.cursorRow > 0) {
		const previousLine = state.lines[state.cursorRow - 1] ?? "";
		state.cursorCol = previousLine.length;
		state.lines[state.cursorRow - 1] = previousLine + line;
		state.lines.splice(state.cursorRow, 1);
		state.cursorRow--;
	}
}

export function moveCursor(state: MultiLineInputState, direction: "left" | "right" | "up" | "down"): void {
	switch (direction) {
		case "left": {
			if (state.cursorCol > 0) {
				state.cursorCol--;
			} else if (state.cursorRow > 0) {
				state.cursorRow--;
				state.cursorCol = state.lines[state.cursorRow]?.length ?? 0;
			}
			break;
		}
		case "right": {
			const line = state.lines[state.cursorRow] ?? "";
			if (state.cursorCol < line.length) {
				state.cursorCol++;
			} else if (state.cursorRow < state.lines.length - 1) {
				state.cursorRow++;
				state.cursorCol = 0;
			}
			break;
		}
		case "up": {
			if (state.cursorRow > 0) {
				state.cursorRow--;
				state.cursorCol = Math.min(state.cursorCol, state.lines[state.cursorRow]?.length ?? 0);
			}
			break;
		}
		case "down": {
			if (state.cursorRow < state.lines.length - 1) {
				state.cursorRow++;
				state.cursorCol = Math.min(state.cursorCol, state.lines[state.cursorRow]?.length ?? 0);
			}
			break;
		}
	}
}
