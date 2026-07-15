import { createInterface } from "node:readline";
import { Agent, createBuiltinTools, SessionManager } from "@aerith/agent";
import { createProvider } from "@aerith/ai";
import type { Args } from "./args.ts";
import { runFirstTimeSetup, shouldRunFirstTimeSetup } from "./first-time-setup.ts";
import { SettingsManager } from "./settings.ts";
import { runTUIMode } from "./tui-mode.ts";

const SYSTEM_PROMPT = `You are Aerith, a helpful coding assistant. You can read files, write files, edit files, and run shell commands through tools. Only use tools when needed. Always prefer the smallest change that solves the user's request.`;

export async function main(args: Args): Promise<void> {
	if (args.help) {
		return;
	}

	if (process.stdin.isTTY && process.stdout.isTTY && shouldRunFirstTimeSetup()) {
		await runFirstTimeSetup();
	}

	const settings = await SettingsManager.create({ cwd: args.cwd, configPath: args.configPath });
	const sessionManager = await resolveSessionManager(args);
	const provider = createProvider({
		provider: args.provider ?? settings.getModel()?.split("/")[0],
		apiKey: args.apiKey ?? settings.getApiKey(),
		baseURL: args.baseURL ?? settings.getBaseURL(),
		model: args.model ?? settings.getModel(),
	});
	const tools = createBuiltinTools({
		cwd: sessionManager.getCwd(),
		allowWrite: args.allowWrite || settings.getAllowWrite() || false,
		allowBash: args.allowBash || settings.getAllowBash() || false,
	});
	const agent = new Agent({
		provider,
		systemPrompt: SYSTEM_PROMPT,
		tools,
	});

	if (args.prompt) {
		await runPrintMode(agent, sessionManager, args.prompt);
		return;
	}

	if (process.stdin.isTTY && process.stdout.isTTY) {
		await runTUIMode({ agent, sessionManager });
		return;
	}

	throw new Error("A prompt is required. Use -p or --prompt, or run in an interactive terminal.");
}

async function runPrintMode(agent: Agent, sessionManager: SessionManager, prompt: string): Promise<void> {
	const result = await agent.run(prompt, { messages: sessionManager.getMessages() });
	sessionManager.setMessages(result.messages);
	await sessionManager.save();
	console.log(result.text);
}

async function resolveSessionManager(args: Args): Promise<SessionManager> {
	if (args.noSession) {
		return SessionManager.create(args.cwd, { sessionDir: args.sessionDir });
	}

	if (args.session) {
		const sessionArg = args.session;
		if (sessionArg.includes("/") || sessionArg.includes("\\") || sessionArg.endsWith(".json")) {
			return SessionManager.open(sessionArg);
		}
		const sessions = await SessionManager.list(args.cwd, args.sessionDir);
		const match = sessions.find((s) => s.id === sessionArg) ?? sessions.find((s) => s.id.startsWith(sessionArg));
		if (!match) {
			throw new Error(`No session found matching '${sessionArg}'`);
		}
		return SessionManager.open(match.path);
	}

	if (args.continueSession) {
		return SessionManager.continueRecent(args.cwd, args.sessionDir);
	}

	if (args.resume) {
		const sessions = await SessionManager.list(args.cwd, args.sessionDir);
		if (sessions.length === 0) {
			throw new Error("No sessions found");
		}
		const selected = await promptSelectSession(sessions);
		if (!selected) {
			throw new Error("No session selected");
		}
		return SessionManager.open(selected);
	}

	return SessionManager.create(args.cwd, { sessionDir: args.sessionDir, name: args.name });
}

async function promptSelectSession(
	sessions: Awaited<ReturnType<typeof SessionManager.list>>,
): Promise<string | undefined> {
	console.log("Select a session:");
	for (let i = 0; i < sessions.length; i++) {
		const s = sessions[i];
		const label = s.name ? `${s.name} (${s.id})` : s.id;
		console.log(`  ${i + 1}. ${label} - ${s.cwd}`);
	}
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await new Promise<string>((resolve) => {
			rl.question("Enter number (or empty to cancel): ", (answer) => resolve(answer));
		});
		if (!answer.trim()) {
			return undefined;
		}
		const index = Number.parseInt(answer, 10) - 1;
		if (index < 0 || index >= sessions.length) {
			throw new Error("Invalid selection");
		}
		return sessions[index].path;
	} finally {
		rl.close();
	}
}
