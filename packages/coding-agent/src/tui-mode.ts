import type { Agent, SessionManager } from "@aerith/agent";
import type { Message } from "@aerith/ai";
import { ProcessTerminal, type ScreenBuffer, TUI, type Message as TUIMessage, type TUIState } from "@aerith/tui";

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
		const lines = wrapText(formatMessage(message), columns - 2, size.rows - 2);
		for (const line of lines) {
			if (row >= size.rows - 2) {
				break;
			}
			screen.writeLine(row, ` ${line}`);
			row++;
		}
	}

	screen.writeLine(size.rows - 1, `> ${state.input}`);
}

function formatMessage(message: TUIMessage): string {
	if (message.type === "user") {
		return `You: ${message.content}`;
	}
	if (message.type === "assistant") {
		return `Aerith: ${message.content}`;
	}
	return `Tool ${message.name}: ${message.content}`;
}

function wrapText(text: string, width: number, maxLines: number): string[] {
	const lines: string[] = [];
	let current = "";
	for (const char of text) {
		if (char === "\n" || current.length >= width) {
			lines.push(current);
			current = char === "\n" ? "" : char;
		} else {
			current += char;
		}
	}
	if (current || lines.length === 0) {
		lines.push(current);
	}
	return lines.slice(-maxLines);
}

function findLastAssistantMessage(messages: Message[]): Message | undefined {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === "assistant") {
			return messages[i];
		}
	}
	return undefined;
}
