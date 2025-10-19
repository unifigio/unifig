#!/usr/bin/env bun
import { parseArgs, showHelp, showVersion } from './parser';
import { runMerge } from '../core/pipeline';
import { createPlugin } from './commands/create-plugin';

export async function main() {
  try {
    const args = process.argv.slice(2);
    const parsed = parseArgs(args);

    if (parsed.help) {
      showHelp();
      return;
    }

    if (parsed.version) {
      showVersion();
      return;
    }

    if (parsed.command === 'create-plugin') {
      if (!parsed.createPlugin) {
        throw new Error('Plugin name is required for create-plugin command');
      }
      await createPlugin(parsed.createPlugin);
      return;
    }

    // Run the merge operation
    await runMerge(parsed.options);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}