import { existsSync, promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type TrustStore = {
	projects: Record<string, boolean>;
};

export class TrustManager {
	private readonly store: TrustStore;
	private readonly filePath: string;

	constructor(filePath?: string) {
		this.filePath = filePath ?? path.join(homedir(), ".aerith", "trust.json");
		this.store = { projects: {} };
	}

	static async load(filePath?: string): Promise<TrustManager> {
		const manager = new TrustManager(filePath);
		await manager.load();
		return manager;
	}

	private async load(): Promise<void> {
		if (!existsSync(this.filePath)) {
			return;
		}
		try {
			const content = await fs.readFile(this.filePath, "utf8");
			const parsed = JSON.parse(content) as TrustStore;
			this.store.projects = parsed.projects ?? {};
		} catch {
			this.store.projects = {};
		}
	}

	async save(): Promise<void> {
		await fs.mkdir(path.dirname(this.filePath), { recursive: true });
		await fs.writeFile(this.filePath, JSON.stringify(this.store, null, 2), "utf8");
	}

	isTrusted(cwd: string): boolean {
		return this.store.projects[path.resolve(cwd)] === true;
	}

	setTrusted(cwd: string, trusted: boolean): void {
		this.store.projects[path.resolve(cwd)] = trusted;
	}
}
