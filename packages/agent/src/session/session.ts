import type { Message } from "@aerith/ai";
import type { SessionData } from "./json-storage.ts";

export class Session {
	private readonly data: SessionData;

	constructor(data: SessionData) {
		this.data = data;
	}

	getMessages(): Message[] {
		return this.data.messages;
	}

	appendMessages(messages: Message[]): void {
		this.data.messages.push(...messages);
		this.data.updatedAt = new Date().toISOString();
	}

	setName(name: string): void {
		this.data.name = name;
		this.data.updatedAt = new Date().toISOString();
	}

	setMessages(messages: Message[]): void {
		this.data.messages = messages;
		this.data.updatedAt = new Date().toISOString();
	}

	toData(): SessionData {
		return this.data;
	}
}
