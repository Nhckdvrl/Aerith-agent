export type Cell = {
	char: string;
	style?: string;
};

export type ScreenSize = {
	rows: number;
	columns: number;
};

export class ScreenBuffer {
	private previous: Cell[][];
	private current: Cell[][];
	private rows: number;
	private columns: number;

	constructor(size: ScreenSize) {
		this.rows = size.rows;
		this.columns = size.columns;
		this.previous = createEmptyGrid(this.rows, this.columns);
		this.current = createEmptyGrid(this.rows, this.columns);
	}

	resize(size: ScreenSize): void {
		this.rows = size.rows;
		this.columns = size.columns;
		this.previous = createEmptyGrid(this.rows, this.columns);
		this.current = createEmptyGrid(this.rows, this.columns);
	}

	getSize(): ScreenSize {
		return { rows: this.rows, columns: this.columns };
	}

	setCell(row: number, col: number, cell: Cell): void {
		if (row < 0 || row >= this.rows || col < 0 || col >= this.columns) {
			return;
		}
		this.current[row][col] = cell;
	}

	setText(row: number, col: number, text: string, style?: string): void {
		let currentCol = col;
		for (const char of text) {
			if (char === "\n") {
				return;
			}
			this.setCell(row, currentCol, { char, style });
			currentCol++;
		}
	}

	writeLine(row: number, text: string, style?: string): void {
		this.setText(row, 0, text, style);
	}

	clear(): void {
		this.current = createEmptyGrid(this.rows, this.columns);
	}

	render(write: (text: string) => void, moveCursor: (row: number, col: number) => void): void {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.columns; col++) {
				const previousCell = this.previous[row][col];
				const currentCell = this.current[row][col];
				if (!cellsEqual(previousCell, currentCell)) {
					moveCursor(row, col);
					write(currentCell.style ?? "");
					write(currentCell.char);
					write("\u001b[0m");
				}
			}
		}
		this.previous = this.current.map((row) => [...row]);
	}
}

function createEmptyGrid(rows: number, columns: number): Cell[][] {
	return Array.from({ length: rows }, () => Array.from({ length: columns }, () => ({ char: " " })));
}

function cellsEqual(a: Cell, b: Cell): boolean {
	return a.char === b.char && a.style === b.style;
}
