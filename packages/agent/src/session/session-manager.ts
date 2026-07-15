import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Message } from "@aerith/ai";
import { readSession, SESSION_VERSION, writeSession } from "./json-storage.ts";
import { Session } from "./session.ts";

export type SessionInfo = {
	id: string;
	path: string;
	cwd: string;
	createdAt: string;
	updatedAt: string;
	name?: string;
};

export type SessionManagerOptions = {
	sessionDir?: string;
	id?: string;
	name?: string;
};

export class SessionManager {
	private readonly session: Session;
	private readonly filePath: string;

	private constructor(session: Session, filePath: string) {
		this.session = session;
		this.filePath = filePath;
	}

	static async create(cwd: string, options: SessionManagerOptions = {}): Promise<SessionManager> {
		const sessionDir = await resolveSessionDir(cwd, options.sessionDir);
		const id = options.id ?? randomUUID();
		const filePath = path.join(sessionDir, `${id}.json`);
		const now = new Date().toISOString();
		const data = {
			version: SESSION_VERSION,
			id,
			createdAt: now,
			updatedAt: now,
			name: options.name,
			cwd: path.resolve(cwd),
			messages: [] as Message[],
		};
		const session = new Session(data);
		const manager = new SessionManager(session, filePath);
		await manager.save();
		return manager;
	}

	static async open(filePath: string): Promise<SessionManager> {
		const data = await readSession(filePath);
		const session = new Session(data);
		return new SessionManager(session, filePath);
	}

	static async list(cwd: string, sessionDir?: string): Promise<SessionInfo[]> {
		const dir = await resolveSessionDir(cwd, sessionDir);
		try {
			const entries = await fs.readdir(dir, { withFileTypes: true });
			const sessions: SessionInfo[] = [];
			for (const entry of entries) {
				if (!entry.isFile() || !entry.name.endsWith(".json")) {
					continue;
				}
				const filePath = path.join(dir, entry.name);
				try {
					const data = await readSession(filePath);
					sessions.push({
						id: data.id,
						path: filePath,
						cwd: data.cwd,
						createdAt: data.createdAt,
						updatedAt: data.updatedAt,
						name: data.name,
					});
				} catch {
					// Ignore corrupted session files
				}
			}
			return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
		} catch {
			return [];
		}
	}

	static async continueRecent(cwd: string, sessionDir?: string): Promise<SessionManager> {
		const sessions = await SessionManager.list(cwd, sessionDir);
		if (sessions.length === 0) {
			throw new Error("No recent session found");
		}
		return SessionManager.open(sessions[0].path);
	}

	getCwd(): string {
		return this.session.toData().cwd;
	}

	getMessages(): Message[] {
		return this.session.getMessages();
	}

	appendMessages(messages: Message[]): void {
		this.session.appendMessages(messages);
	}

	setMessages(messages: Message[]): void {
		this.session.setMessages(messages);
	}

	setName(name: string): void {
		this.session.setName(name);
	}

	async save(): Promise<void> {
		await writeSession(this.filePath, this.session.toData());
	}

	getInfo(): SessionInfo {
		const data = this.session.toData();
		return {
			id: data.id,
			path: this.filePath,
			cwd: data.cwd,
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
			name: data.name,
		};
	}
}

async function resolveSessionDir(cwd: string, sessionDir?: string): Promise<string> {
	if (sessionDir) {
		return path.resolve(sessionDir);
	}
	return path.resolve(cwd, ".aerith", "sessions");
}
