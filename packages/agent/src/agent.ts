import type { Message, Tool, ToolCall } from "@aerith/ai";
import { type CompactionOptions, compact } from "./compaction.ts";
import type { AgentOptions, AgentRunResult, ToolDefinition } from "./types.ts";

const DEFAULT_MAX_ITERATIONS = 25;

export class Agent {
	private readonly provider: AgentOptions["provider"];
	private readonly systemPrompt?: string;
	private readonly maxIterations: number;
	private readonly tools: Map<string, ToolDefinition>;
	private readonly compaction?: CompactionOptions;

	constructor(options: AgentOptions) {
		this.provider = options.provider;
		this.systemPrompt = options.systemPrompt;
		this.maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
		this.tools = options.tools ?? new Map<string, ToolDefinition>();
		this.compaction = options.compaction;
	}

	addTool(name: string, definition: ToolDefinition): void {
		this.tools.set(name, definition);
	}

	async run(input: string, options: { messages?: Message[] } = {}): Promise<AgentRunResult> {
		const messages: Message[] = options.messages ? [...options.messages] : [];
		messages.push({ role: "user", content: input });

		for (let iteration = 0; iteration < this.maxIterations; iteration++) {
			const compacted = this.compaction ? compact(messages, this.compaction) : messages;
			const toolDefinitions = Array.from(this.tools.values());
			const toolSchemas: Tool[] = toolDefinitions.map((definition) => definition.schema);
			const events = this.provider.generate(compacted, toolSchemas, {
				systemPrompt: this.systemPrompt,
			});

			let text = "";
			const toolCalls: ToolCall[] = [];
			for await (const event of events) {
				if (event.type === "text") {
					text += event.delta;
				} else if (event.type === "toolCall") {
					toolCalls.push(event.toolCall);
				}
			}

			if (toolCalls.length === 0) {
				messages.push({ role: "assistant", content: text });
				return { messages, text };
			}

			messages.push({ role: "assistant", content: text || "", toolCalls });

			for (const toolCall of toolCalls) {
				const result = await this.executeTool(toolCall);
				messages.push({
					role: "tool",
					content: result,
					toolCallId: toolCall.id,
				});
			}
		}

		return { messages, text: "Reached maximum tool iterations." };
	}

	private async executeTool(toolCall: ToolCall): Promise<string> {
		const definition = this.tools.get(toolCall.name);
		if (!definition) {
			return `Error: tool "${toolCall.name}" not found.`;
		}
		try {
			return await definition.execute(toolCall.arguments);
		} catch (error) {
			return error instanceof Error ? `Error: ${error.message}` : `Error: ${String(error)}`;
		}
	}
}
