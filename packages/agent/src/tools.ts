import { exec } from "node:child_process";
import { constants, promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { ToolDefinition } from "./types.ts";

const execAsync = promisify(exec);

export type BuiltinToolOptions = {
	cwd: string;
	allowWrite?: boolean;
	allowBash?: boolean;
};

export function createBuiltinTools(options: BuiltinToolOptions): Map<string, ToolDefinition> {
	const cwd = path.resolve(options.cwd);
	const tools = new Map<string, ToolDefinition>();

	tools.set("read_file", {
		schema: {
			name: "read_file",
			description: "Read the contents of a file at the given path.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative or absolute path to the file." },
				},
				required: ["path"],
			},
		},
		execute: async (args) => {
			const parsed = parseArgs(args);
			const filePath = requireString(parsed.path, "path");
			const resolved = resolvePath(filePath, cwd);
			try {
				await fs.access(resolved, constants.R_OK);
				const content = await fs.readFile(resolved, "utf8");
				return content;
			} catch (error) {
				return formatError(error);
			}
		},
	});

	tools.set("write_file", {
		schema: {
			name: "write_file",
			description: "Write content to a file at the given path.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative or absolute path to the file." },
					content: { type: "string", description: "Content to write." },
				},
				required: ["path", "content"],
			},
		},
		execute: async (args) => {
			if (!options.allowWrite) {
				return "Error: write_file is disabled.";
			}
			const parsed = parseArgs(args);
			const filePath = requireString(parsed.path, "path");
			const content = requireString(parsed.content, "content");
			const resolved = resolvePath(filePath, cwd);
			try {
				await fs.mkdir(path.dirname(resolved), { recursive: true });
				await fs.writeFile(resolved, content, "utf8");
				return `Wrote ${resolved}`;
			} catch (error) {
				return formatError(error);
			}
		},
	});

	tools.set("edit_file", {
		schema: {
			name: "edit_file",
			description: "Replace an exact string in a file with a new string.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative or absolute path to the file." },
					old_string: { type: "string", description: "Exact string to replace." },
					new_string: { type: "string", description: "Replacement string." },
				},
				required: ["path", "old_string", "new_string"],
			},
		},
		execute: async (args) => {
			if (!options.allowWrite) {
				return "Error: edit_file is disabled.";
			}
			const parsed = parseArgs(args);
			const filePath = requireString(parsed.path, "path");
			const oldString = requireString(parsed.old_string, "old_string");
			const newString = requireString(parsed.new_string, "new_string");
			const resolved = resolvePath(filePath, cwd);
			try {
				const content = await fs.readFile(resolved, "utf8");
				if (!content.includes(oldString)) {
					return "Error: old_string not found in file.";
				}
				const updated = content.replace(oldString, newString);
				await fs.writeFile(resolved, updated, "utf8");
				return `Edited ${resolved}`;
			} catch (error) {
				return formatError(error);
			}
		},
	});

	tools.set("list_dir", {
		schema: {
			name: "list_dir",
			description: "List files and directories in a directory.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative or absolute path to the directory." },
					recursive: { type: "boolean", description: "List recursively." },
				},
				required: ["path"],
			},
		},
		execute: async (args) => {
			const parsed = parseArgs(args);
			const dirPath = requireString(parsed.path, "path");
			const recursive = requireBoolean(parsed.recursive, "recursive") ?? false;
			const resolved = resolvePath(dirPath, cwd);
			try {
				const entries = await listDirectory(resolved, recursive, "");
				return entries.join("\n");
			} catch (error) {
				return formatError(error);
			}
		},
	});

	tools.set("grep", {
		schema: {
			name: "grep",
			description: "Search for a regex pattern in files within a directory.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Directory to search." },
					pattern: { type: "string", description: "Regex pattern to search for." },
					file_pattern: { type: "string", description: "Glob pattern to match files." },
				},
				required: ["path", "pattern"],
			},
		},
		execute: async (args) => {
			const parsed = parseArgs(args);
			const dirPath = requireString(parsed.path, "path");
			const pattern = requireString(parsed.pattern, "pattern");
			const filePattern = parsed.file_pattern ? requireString(parsed.file_pattern, "file_pattern") : undefined;
			const resolved = resolvePath(dirPath, cwd);
			try {
				const regex = new RegExp(pattern, "g");
				const matches = await grepDirectory(resolved, regex, filePattern);
				return matches.join("\n") || "(no matches)";
			} catch (error) {
				return formatError(error);
			}
		},
	});

	tools.set("bash", {
		schema: {
			name: "bash",
			description: "Run a shell command in the project directory.",
			parameters: {
				type: "object",
				properties: {
					command: { type: "string", description: "Shell command to run." },
					timeout: { type: "number", description: "Timeout in milliseconds." },
				},
				required: ["command"],
			},
		},
		execute: async (args) => {
			if (!options.allowBash) {
				return "Error: bash is disabled.";
			}
			const parsed = parseArgs(args);
			const command = requireString(parsed.command, "command");
			const timeout = requireNumber(parsed.timeout, "timeout") ?? 60000;
			try {
				const { stdout, stderr } = await execAsync(command, {
					cwd,
					timeout,
					maxBuffer: 1024 * 1024,
				});
				const output = [stdout, stderr].filter(Boolean).join("\n");
				return output || "(no output)";
			} catch (error) {
				return formatError(error);
			}
		},
	});

	return tools;
}

function parseArgs(args: string): Record<string, string | number | undefined> {
	try {
		return JSON.parse(args) as Record<string, string | number | undefined>;
	} catch {
		return {};
	}
}

function resolvePath(filePath: string | number | undefined, cwd: string): string {
	if (typeof filePath !== "string") {
		throw new Error("path must be a string");
	}
	const expanded = filePath.startsWith("~") ? path.join(homedir(), filePath.slice(1)) : filePath;
	const resolved = path.resolve(cwd, expanded);
	const relative = path.relative(cwd, resolved);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		throw new Error("path must be within the project directory");
	}
	return resolved;
}

function formatError(error: unknown): string {
	return error instanceof Error ? `Error: ${error.message}` : `Error: ${String(error)}`;
}

function requireString(value: string | number | undefined, name: string): string {
	if (typeof value !== "string") {
		throw new Error(`${name} must be a string`);
	}
	return value;
}

function requireNumber(value: string | number | undefined, name: string): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "number") {
		throw new Error(`${name} must be a number`);
	}
	return value;
}

function requireBoolean(value: string | number | boolean | undefined, name: string): boolean | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value === "boolean") {
		return value;
	}
	if (value === "true") {
		return true;
	}
	if (value === "false") {
		return false;
	}
	throw new Error(`${name} must be a boolean`);
}

async function listDirectory(dir: string, recursive: boolean, prefix: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const lines: string[] = [];
	for (const entry of entries) {
		if (entry.name === ".git" || entry.name === "node_modules") {
			continue;
		}
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
		lines.push(entry.isDirectory() ? `${relative}/` : relative);
		if (recursive && entry.isDirectory()) {
			const nested = await listDirectory(path.join(dir, entry.name), true, relative);
			lines.push(...nested);
		}
	}
	return lines;
}

async function grepDirectory(dir: string, regex: RegExp, filePattern?: string): Promise<string[]> {
	const matches: string[] = [];
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name === ".git" || entry.name === "node_modules") {
			continue;
		}
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			const nested = await grepDirectory(fullPath, regex, filePattern);
			matches.push(...nested);
		} else if (!filePattern || matchGlob(entry.name, filePattern)) {
			try {
				const content = await fs.readFile(fullPath, "utf8");
				const lines = content.split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (regex.test(lines[i])) {
						matches.push(`${path.relative(dir, fullPath)}:${i + 1}: ${lines[i].trim()}`);
						regex.lastIndex = 0;
					}
				}
			} catch {
				// Skip binary or unreadable files
			}
		}
	}
	return matches;
}

function matchGlob(fileName: string, pattern: string): boolean {
	if (pattern === "*" || pattern === "**") {
		return true;
	}
	if (pattern.startsWith("*") && pattern.endsWith("*")) {
		return fileName.includes(pattern.slice(1, -1));
	}
	if (pattern.startsWith("*")) {
		return fileName.endsWith(pattern.slice(1));
	}
	if (pattern.endsWith("*")) {
		return fileName.startsWith(pattern.slice(0, -1));
	}
	return fileName === pattern;
}
