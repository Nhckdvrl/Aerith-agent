import { promises as fs } from "node:fs";
import path from "node:path";
import type { Message } from "@aerith/ai";

export const SESSION_VERSION = 1;

export type SessionData = {
	version: number;
	id: string;
	createdAt: string;
	updatedAt: string;
	name?: string;
	cwd: string;
	messages: Message[];
};

export async function readSession(filePath: string): Promise<SessionData> {
	const content = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(content) as SessionData;
	if (data.version !== SESSION_VERSION) {
		throw new Error(`Unsupported session version: ${data.version}`);
	}
	return data;
}

export async function writeSession(filePath: string, data: SessionData): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}
