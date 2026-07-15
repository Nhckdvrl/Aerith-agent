export type KeyEvent = {
	key: string;
	ctrl: boolean;
	meta: boolean;
	shift: boolean;
};

export interface Terminal {
	write(text: string): void;
	getSize(): { rows: number; columns: number };
	onKey(listener: (key: KeyEvent) => void): () => void;
	clear(): void;
	moveCursor(row: number, col: number): void;
	showCursor(): void;
	hideCursor(): void;
}

export class ProcessTerminal implements Terminal {
	private readonly listeners: Set<(key: KeyEvent) => void> = new Set();
	private readonly stdin: NodeJS.ReadStream;
	private readonly stdout: NodeJS.WriteStream;
	private rawMode = false;

	constructor(stdin: NodeJS.ReadStream = process.stdin, stdout: NodeJS.WriteStream = process.stdout) {
		this.stdin = stdin;
		this.stdout = stdout;
		this.stdin.on("data", (data) => this.handleInput(data as Buffer));
	}

	write(text: string): void {
		this.stdout.write(text);
	}

	getSize(): { rows: number; columns: number } {
		return {
			rows: this.stdout.rows ?? 24,
			columns: this.stdout.columns ?? 80,
		};
	}

	onKey(listener: (key: KeyEvent) => void): () => void {
		this.listeners.add(listener);
		this.enableRawMode();
		return () => {
			this.listeners.delete(listener);
			if (this.listeners.size === 0) {
				this.disableRawMode();
			}
		};
	}

	clear(): void {
		this.write("\u001b[2J\u001b[H");
	}

	moveCursor(row: number, col: number): void {
		this.write(`\u001b[${row + 1};${col + 1}H`);
	}

	showCursor(): void {
		this.write("\u001b[?25h");
	}

	hideCursor(): void {
		this.write("\u001b[?25l");
	}

	private enableRawMode(): void {
		if (this.rawMode || !this.stdin.isTTY) {
			return;
		}
		this.stdin.setRawMode(true);
		this.rawMode = true;
	}

	private disableRawMode(): void {
		if (!this.rawMode || !this.stdin.isTTY) {
			return;
		}
		this.stdin.setRawMode(false);
		this.rawMode = false;
	}

	private handleInput(data: Buffer): void {
		const sequence = data.toString("utf8");
		let i = 0;
		while (i < sequence.length) {
			const { event, consumed } = parseKey(sequence, i);
			for (const listener of this.listeners) {
				listener(event);
			}
			i += consumed;
		}
	}
}

function parseKey(sequence: string, start: number): { event: KeyEvent; consumed: number } {
	const char = sequence[start];
	const code = char.charCodeAt(0);

	if (char === "\u001b") {
		if (sequence[start + 1] === "[") {
			const key = sequence[start + 2];
			switch (key) {
				case "A":
					return { event: { key: "up", ctrl: false, meta: false, shift: false }, consumed: 3 };
				case "B":
					return { event: { key: "down", ctrl: false, meta: false, shift: false }, consumed: 3 };
				case "C":
					return { event: { key: "right", ctrl: false, meta: false, shift: false }, consumed: 3 };
				case "D":
					return { event: { key: "left", ctrl: false, meta: false, shift: false }, consumed: 3 };
				default:
					return { event: { key: "escape", ctrl: false, meta: true, shift: false }, consumed: 2 };
			}
		}
		return { event: { key: "escape", ctrl: false, meta: false, shift: false }, consumed: 1 };
	}

	if (code === 13) {
		return { event: { key: "return", ctrl: false, meta: false, shift: false }, consumed: 1 };
	}
	if (code === 127 || code === 8) {
		return { event: { key: "backspace", ctrl: false, meta: false, shift: false }, consumed: 1 };
	}
	if (code === 9) {
		return { event: { key: "tab", ctrl: false, meta: false, shift: false }, consumed: 1 };
	}
	if (code < 32) {
		const letter = String.fromCharCode(code + 96);
		return { event: { key: letter, ctrl: true, meta: false, shift: false }, consumed: 1 };
	}

	return { event: { key: char, ctrl: false, meta: false, shift: false }, consumed: 1 };
}
