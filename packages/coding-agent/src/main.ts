import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { Agent, createBuiltinTools, ExtensionManager, SessionManager } from "@aerith/agent";
import { createProvider, ModelRegistry } from "@aerith/ai";
import type { Args } from "./args.ts";
import { helloExtension } from "./extensions/hello.ts";
import { runFirstTimeSetup, shouldRunFirstTimeSetup } from "./first-time-setup.ts";
import { SettingsManager } from "./settings.ts";
import { TrustManager } from "./trust.ts";
import { runTUIMode } from "./tui-mode.ts";

const SYSTEM_PROMPT = `You are Aerith, a helpful coding assistant. You can read files, write files, edit files, and run shell commands through tools. Only use tools when needed. Always prefer the smallest change that solves the user's request.`;

export async function main(args: Args): Promise<void> {
	if (args.help) {
		return;
	}

	if (args.listModels !== undefined) {
		const registry = new ModelRegistry();
		const models = registry.search(args.listModels || undefined);
		for (const model of models) {
			console.log(`${model.provider}/${model.id} - ${model.name}`);
		}
		return;
	}

	if (process.stdin.isTTY && process.stdout.isTTY && shouldRunFirstTimeSetup()) {
		await runFirstTimeSetup();
	}

	const settings = await SettingsManager.create({ cwd: args.cwd, configPath: args.configPath });
	const sessionManager = await resolveSessionManager(args);

	const allowWrite = args.allowWrite || settings.getAllowWrite() || false;
	const allowBash = args.allowBash || settings.getAllowBash() || false;
	if ((allowWrite || allowBash) && !args.noSession) {
		const trustManager = await TrustManager.load();
		await resolveTrust(args, trustManager, sessionManager.getCwd());
	}

	const provider = createProvider({
		provider: args.provider ?? settings.getModel()?.split("/")[0],
		apiKey: args.apiKey ?? settings.getApiKey(),
		baseURL: args.baseURL ?? settings.getBaseURL(),
		model: args.model ?? settings.getModel(),
	});
	const tools = createBuiltinTools({
		cwd: sessionManager.getCwd(),
		allowWrite,
		allowBash,
	});

	const extensionManager = new ExtensionManager({
		cwd: sessionManager.getCwd(),
		settings: settings.getExtensionSettings(),
		allowedPermissions: { write: allowWrite, bash: allowBash },
		logger: (message) => console.error(message),
	});
	await extensionManager.loadBuiltIn([helloExtension]);
	await extensionManager.loadFromDirectory(path.join(homedir(), ".aerith", "extensions"));
	for (const [name, tool] of extensionManager.getTools()) {
		tools.set(name, tool);
	}

	const agent = new Agent({
		provider,
		systemPrompt: SYSTEM_PROMPT,
		tools,
		compaction: { maxTokens: 16000, keepRecentMessages: 8 },
	});

	if (args.prompt) {
		await runPrintMode(agent, sessionManager, args.prompt);
		return;
	}

	if (process.stdin.isTTY && process.stdout.isTTY) {
		await runTUIMode({ agent, sessionManager, settings });
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

async function resolveTrust(args: Args, trustManager: TrustManager, cwd: string): Promise<void> {
	if (args.trust) {
		trustManager.setTrusted(cwd, true);
		await trustManager.save();
		return;
	}

	if (trustManager.isTrusted(cwd)) {
		return;
	}

	if (process.stdin.isTTY && process.stdout.isTTY) {
		const rl = createInterface({ input: process.stdin, output: process.stdout });
		try {
			const answer = await new Promise<string>((resolve) => {
				rl.question(`Trust this project (${cwd}) for write/bash tools? [y/N] `, (answer) =>
					resolve(answer.trim().toLowerCase()),
				);
			});
			const trusted = answer === "y" || answer === "yes";
			trustManager.setTrusted(cwd, trusted);
			await trustManager.save();
			if (!trusted) {
				throw new Error("Project not trusted. Use --trust to trust it, or run without write/bash tools.");
			}
		} finally {
			rl.close();
		}
		return;
	}

	throw new Error("Project trust is required for write/bash tools. Run with --trust or disable these tools.");
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
