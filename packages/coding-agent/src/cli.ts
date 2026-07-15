#!/usr/bin/env node
import chalk from "chalk";
import { parseArgs, printHelp } from "./args.ts";
import { main } from "./main.ts";

async function run(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printHelp();
		return;
	}
	try {
		await main(args);
	} catch (error) {
		console.error(chalk.red(error instanceof Error ? error.message : String(error)));
		process.exit(1);
	}
}

run();
