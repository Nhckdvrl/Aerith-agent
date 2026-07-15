export type Args = {
	prompt?: string;
	model?: string;
	provider?: string;
	apiKey?: string;
	baseURL?: string;
	configPath?: string;
	cwd: string;
	allowWrite: boolean;
	allowBash: boolean;
	noSession: boolean;
	session?: string;
	continueSession: boolean;
	resume: boolean;
	sessionDir?: string;
	name?: string;
	listModels?: string;
	trust?: boolean;
	help: boolean;
};

export function parseArgs(argv: string[]): Args {
	const args: Args = {
		cwd: process.cwd(),
		allowWrite: false,
		allowBash: false,
		noSession: false,
		continueSession: false,
		resume: false,
		help: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "-p":
			case "--prompt":
				args.prompt = argv[++i];
				break;
			case "-m":
			case "--model":
				args.model = argv[++i];
				break;
			case "--provider":
				args.provider = argv[++i];
				break;
			case "--api-key":
				args.apiKey = argv[++i];
				break;
			case "--base-url":
				args.baseURL = argv[++i];
				break;
			case "--config":
				args.configPath = argv[++i];
				break;
			case "--cwd":
				args.cwd = argv[++i];
				break;
			case "--allow-write":
				args.allowWrite = true;
				break;
			case "--allow-bash":
				args.allowBash = true;
				break;
			case "--no-session":
				args.noSession = true;
				break;
			case "--session":
				args.session = argv[++i];
				break;
			case "--continue":
				args.continueSession = true;
				break;
			case "--resume":
				args.resume = true;
				break;
			case "--session-dir":
				args.sessionDir = argv[++i];
				break;
			case "--name":
				args.name = argv[++i];
				break;
			case "--list-models":
				args.listModels = argv[i + 1]?.startsWith("-") ? "" : (argv[++i] ?? "");
				break;
			case "--trust":
				args.trust = true;
				break;
			case "-h":
			case "--help":
				args.help = true;
				break;
		}
	}

	return args;
}

export function printHelp(): void {
	console.log(`aerith [options]

Options:
  -p, --prompt <text>   Run a single prompt and exit
  -m, --model <name>   LLM model name (e.g. kimi/k2.7-code or gpt-4o-mini)
  --provider <name>    Provider: openai, kimi, moonshot (default: openai)
  --api-key <key>      API key (or set OPENAI_API_KEY / MOONSHOT_API_KEY)
  --base-url <url>     Custom API base URL
  --config <path>     Path to a config JSON file
  --cwd <dir>           Working directory (default: current directory)
  --allow-write        Enable write_file and edit_file tools
  --allow-bash         Enable bash tool
  --no-session         Do not persist this conversation
  --session <id/path> Open a specific session
  --continue           Continue the most recent session
  --resume             List sessions and select one to continue
  --session-dir <dir>  Directory for session files
  --name <name>       Name the session
  --list-models       List available models
  --trust             Trust the current project for write/bash tools
  -h, --help          Show this help
`);
}
