import { ScreenBuffer } from "./screen.ts";
import type { KeyEvent, Terminal } from "./terminal.ts";

export type TUIState = {
	input: string;
	history: string[];
	historyIndex: number;
	cursor: number;
	messages: Message[];
};

export type Message =
	| { type: "user"; content: string }
	| { type: "assistant"; content: string }
	| { type: "tool"; name: string; content: string };

export type RenderFn = (screen: ScreenBuffer, state: TUIState) => void;
export type SubmitFn = (input: string, state: TUIState) => Promise<void>;

export class TUI {
	private readonly terminal: Terminal;
	private readonly render: RenderFn;
	private readonly onSubmit: SubmitFn;
	private readonly state: TUIState;
	private readonly screen: ScreenBuffer;
	private running = false;
	private unsubscribe?: () => void;

	constructor(terminal: Terminal, render: RenderFn, onSubmit: SubmitFn) {
		this.terminal = terminal;
		this.render = render;
		this.onSubmit = onSubmit;
		this.state = {
			input: "",
			history: [],
			historyIndex: -1,
			cursor: 0,
			messages: [],
		};
		this.screen = new ScreenBuffer(terminal.getSize());
	}

	start(): void {
		if (this.running) {
			return;
		}
		this.running = true;
		this.terminal.hideCursor();
		this.terminal.clear();
		this.unsubscribe = this.terminal.onKey((key) => this.handleKey(key));
		this.draw();
	}

	stop(): void {
		this.running = false;
		this.unsubscribe?.();
		this.terminal.showCursor();
		this.terminal.clear();
		this.terminal.write("\n");
	}

	getState(): TUIState {
		return this.state;
	}

	addMessage(message: Message): void {
		this.state.messages.push(message);
		this.draw();
	}

	private handleKey(key: KeyEvent): void {
		if (key.key === "return" && !key.ctrl) {
			this.submit();
			return;
		}
		if (key.key === "backspace") {
			if (this.state.cursor > 0) {
				this.state.input =
					this.state.input.slice(0, this.state.cursor - 1) + this.state.input.slice(this.state.cursor);
				this.state.cursor--;
			}
			this.draw();
			return;
		}
		if (key.key === "left") {
			this.state.cursor = Math.max(0, this.state.cursor - 1);
			this.draw();
			return;
		}
		if (key.key === "right") {
			this.state.cursor = Math.min(this.state.input.length, this.state.cursor + 1);
			this.draw();
			return;
		}
		if (key.key === "up" && this.state.historyIndex < this.state.history.length - 1) {
			this.state.historyIndex++;
			this.state.input = this.state.history[this.state.history.length - 1 - this.state.historyIndex] ?? "";
			this.state.cursor = this.state.input.length;
			this.draw();
			return;
		}
		if (key.key === "down" && this.state.historyIndex >= 0) {
			this.state.historyIndex--;
			this.state.input =
				this.state.historyIndex === -1
					? ""
					: (this.state.history[this.state.history.length - 1 - this.state.historyIndex] ?? "");
			this.state.cursor = this.state.input.length;
			this.draw();
			return;
		}
		if (key.key.length === 1) {
			this.state.input =
				this.state.input.slice(0, this.state.cursor) + key.key + this.state.input.slice(this.state.cursor);
			this.state.cursor++;
			this.draw();
		}
	}

	private async submit(): Promise<void> {
		const input = this.state.input.trim();
		if (!input) {
			return;
		}
		this.state.history.push(input);
		this.state.historyIndex = -1;
		this.state.input = "";
		this.state.cursor = 0;
		this.state.messages.push({ type: "user", content: input });
		this.draw();
		await this.onSubmit(input, this.state);
	}

	private draw(): void {
		if (!this.running) {
			return;
		}
		const size = this.terminal.getSize();
		if (size.rows !== this.screen.getSize().rows || size.columns !== this.screen.getSize().columns) {
			this.screen.resize(size);
			this.terminal.clear();
		}
		this.screen.clear();
		this.render(this.screen, this.state);
		this.screen.render(
			(text) => this.terminal.write(text),
			(row, col) => this.terminal.moveCursor(row, col),
		);
		this.terminal.moveCursor(size.rows - 1, this.state.input.length + 2);
	}
}
