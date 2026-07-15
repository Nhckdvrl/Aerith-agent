import type { Agent, SessionManager } from "@aerith/agent";
import { createProvider, ModelRegistry } from "@aerith/ai";
import type { Message } from "@aerith/ai";
import { ProcessTerminal, renderMarkdownToLines, type ScreenBuffer, TUI, type TUIState } from "@aerith/tui";
import type { SettingsManager } from "./settings.ts";

export type TUIModeOptions = {
	agent: Agent;
	sessionManager: SessionManager;
	settings: SettingsManager;
};

export function runTUIMode(options: TUIModeOptions): Promise<void> {
	const terminal = new ProcessTerminal();
	const tui = new TUI(
		terminal,
		(screen, state) => render(screen, state, terminal.getSize().columns),
		async (input, state) => {
			if (input.startsWith("/model ")) {
				const modelArg = input.slice("/model ".length).trim();
				const result = switchModel(options.agent, options.settings, modelArg);
				tui.addMessage({ type: "assistant", content: result });
				return;
			}
			if (input === "/model") {
				const registry = new ModelRegistry();
				const models = registry.search();
				const list = models.map((m) => `${m.provider}/${m.id}`).join("\n");
				tui.addMessage({ type: "assistant", content: `Available models:\n${list}\n\nUsage: /model provider/model` });
				return;
			}
			if (input === "/clear") {
				state.messages = [];
				state.pendingAssistantContent = undefined;
				options.sessionManager.setMessages([]);
				await options.sessionManager.save();
				tui.draw();
				return;
			}
			const agentMessages = state.messages
				.filter(
					(m): m is { type: "user" | "assistant"; content: string } => m.type === "user" || m.type === "assistant",
				)
				.map((m) => ({ role: m.type, content: m.content }));
			state.pendingAssistantContent = "";
			const result = await options.agent.run(input, {
				messages: agentMessages,
				onTextDelta: (delta) => {
					state.pendingAssistantContent += delta;
					tui.draw();
				},
			});
			state.pendingAssistantContent = undefined;
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

	const inputHeight = Math.max(1, state.input.lines.length);
	const visibleRows = size.rows - inputHeight - 1;
	const allLines: { text: string; style?: string }[][] = [];

	for (const message of state.messages) {
		const prefix =
			message.type === "user" ? "You: " : message.type === "assistant" ? "Aerith: " : `Tool ${message.name}: `;
		const text = `${prefix}${message.content}`;
		const lines =
			message.type === "assistant" ? renderMarkdownToLines(text, columns - 2) : wrapTextToCells(text, columns - 2);
		allLines.push(...lines, []);
	}

	if (state.pendingAssistantContent !== undefined) {
		const text = `Aerith: ${state.pendingAssistantContent}`;
		const lines = renderMarkdownToLines(text, columns - 2);
		allLines.push(...lines, []);
	}

	const maxScroll = Math.max(0, allLines.length - visibleRows);
	const scrollOffset = Math.max(0, Math.min(state.scrollOffset, maxScroll));
	state.scrollOffset = scrollOffset;

	const startLine = allLines.length - visibleRows - scrollOffset;
	let row = 0;
	for (let i = Math.max(0, startLine); i < allLines.length && row < visibleRows; i++) {
		const line = allLines[i];
		let col = 1;
		for (const cell of line) {
			screen.setCell(row, col, { char: cell.text, style: cell.style });
			col++;
		}
		row++;
	}

	const prompt = "> ";
	for (let i = 0; i < state.input.lines.length; i++) {
		screen.writeLine(size.rows - inputHeight + i, `${prompt}${state.input.lines[i]}`);
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

function switchModel(agent: Agent, settings: SettingsManager, modelArg: string): string {
	try {
		const provider = createProvider({
			provider: modelArg.split("/")[0],
			apiKey: settings.getApiKey(),
			baseURL: settings.getBaseURL(),
			model: modelArg,
		});
		agent.setProvider(provider);
		return `Switched to model ${modelArg}.`;
	} catch (error) {
		return `Failed to switch model: ${error instanceof Error ? error.message : String(error)}`;
	}
}
