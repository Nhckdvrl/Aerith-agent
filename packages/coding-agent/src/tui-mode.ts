import type { Agent, SessionManager } from "@aerith/agent";
import type { Message } from "@aerith/ai";
import { ProcessTerminal, renderMarkdownToLines, type ScreenBuffer, TUI, type TUIState } from "@aerith/tui";

export type TUIModeOptions = {
	agent: Agent;
	sessionManager: SessionManager;
};

export function runTUIMode(options: TUIModeOptions): Promise<void> {
	const terminal = new ProcessTerminal();
	const tui = new TUI(
		terminal,
		(screen, state) => render(screen, state, terminal.getSize().columns),
		async (input, state) => {
			const agentMessages = state.messages
				.filter(
					(m): m is { type: "user" | "assistant"; content: string } => m.type === "user" || m.type === "assistant",
				)
				.map((m) => ({ role: m.type, content: m.content }));
			const result = await options.agent.run(input, { messages: agentMessages });
			options.sessionManager.setMessages(result.messages);
			await options.sessionManager.save();
			const assistantMessage = findLastAssistantMessage(result.messages);
			if (assistantMessage) {
				const content = typeof assistantMessage.content === "string" ? assistantMessage.content : "";
				tui.addMessage({ type: "assistant", content });
			}
		},
	);

	const cleanup = () => {
		tui.stop();
		process.exit(0);
	};
	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);

	return new Promise((_resolve) => {
		tui.start();
	});
}

function render(screen: ScreenBuffer, state: TUIState, columns: number): void {
	const size = screen.getSize();
	screen.clear();

	let row = 0;
	for (const message of state.messages) {
		const prefix =
			message.type === "user" ? "You: " : message.type === "assistant" ? "Aerith: " : `Tool ${message.name}: `;
		const text = `${prefix}${message.content}`;
		const lines =
			message.type === "assistant" ? renderMarkdownToLines(text, columns - 2) : wrapTextToCells(text, columns - 2);
		for (const line of lines) {
			if (row >= size.rows - 4) {
				break;
			}
			let col = 1;
			for (const cell of line) {
				screen.setCell(row, col, { char: cell.text, style: cell.style });
				col++;
			}
			row++;
		}
	}

	const input = state.input;
	const prompt = "> ";
	for (let i = 0; i < input.lines.length; i++) {
		screen.writeLine(size.rows - input.lines.length + i, `${prompt}${input.lines[i]}`);
	}
}

function wrapTextToCells(text: string, width: number): { text: string; style?: string }[][] {
	const lines: { text: string; style?: string }[][] = [];
	let current = "";
	for (const char of text) {
		if (char === "\n" || current.length >= width) {
			lines.push([{ text: current }]);
			current = char === "\n" ? "" : char;
		} else {
			current += char;
		}
	}
	if (current || lines.length === 0) {
		lines.push([{ text: current }]);
	}
	return lines;
}

function findLastAssistantMessage(messages: Message[]): Message | undefined {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === "assistant") {
			return messages[i];
		}
	}
	return undefined;
}
