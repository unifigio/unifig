import type { unifigOptions } from '../types';

export interface ParsedArgs {
  command: string;
  options: Partial<unifigOptions>;
  help?: boolean;
  version?: boolean;
  createPlugin?: string;
}

export function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: 'merge',
    options: {},
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        parsed.help = true;
        break;

      case '--version':
      case '-v':
        parsed.version = true;
        break;

      case '--dry-run':
      case '-d':
        parsed.options.dryRun = true;
        break;

      case '--force':
      case '-f':
        parsed.options.force = true;
        break;

      case '--interactive':
      case '-i':
        parsed.options.interactive = true;
        break;

      case '--create-dirs':
        parsed.options.createDirs = true;
        break;

      case '--verbose':
        parsed.options.verbose = true;
        break;

      case '--pattern':
      case '-p':
        if (i + 1 < args.length) {
          const pattern = args[i + 1];
          if (pattern) {
            if (!parsed.options.patterns) parsed.options.patterns = [];
            parsed.options.patterns.push(pattern);
          }
          i++;
        }
        break;

      case '--plugin':
        if (i + 1 < args.length) {
          const plugin = args[i + 1];
          if (plugin) {
            if (!parsed.options.plugins) parsed.options.plugins = [];
            parsed.options.plugins.push(plugin);
          }
          i++;
        }
        break;

      case '--parallel':
        if (i + 1 < args.length) {
          const parallelArg = args[i + 1];
          if (parallelArg) {
            const parallel = parseInt(parallelArg, 10);
            if (!isNaN(parallel)) {
              parsed.options.parallel = parallel;
            }
          }
          i++;
        }
        break;

      default:
        // Handle commands
        if (arg === 'create-plugin') {
          parsed.command = 'create-plugin';
          break;
        }

        // Check for unknown options
        if (arg && arg.startsWith('-')) {
          throw new Error(`Unknown argument: ${arg}`);
        }

        // Positional arguments
        if (parsed.command === 'create-plugin') {
          if (!parsed.createPlugin) {
            parsed.createPlugin = arg;
          } else {
            throw new Error('Too many arguments for create-plugin command');
          }
        } else if (!parsed.options.source) {
          parsed.options.source = arg;
        } else if (!parsed.options.destination) {
          parsed.options.destination = arg;
        } else {
          // Too many positional arguments
          throw new Error('Too many arguments');
        }
        break;
    }

    i++;
  }

  // Validate required arguments
  if (!parsed.help && !parsed.version && parsed.command === 'merge') {
    if (!parsed.options.source || parsed.options.source.trim() === '') {
      throw new Error('Source path is required');
    }
    if (!parsed.options.destination || parsed.options.destination.trim() === '') {
      throw new Error('Destination path is required');
    }
  }

  if (!parsed.help && !parsed.version && parsed.command === 'create-plugin') {
    if (!parsed.createPlugin || parsed.createPlugin.trim() === '') {
      throw new Error('Plugin name is required for create-plugin command');
    }
  }

  // Cast to unifigOptions after validation
  return parsed as ParsedArgs & { options: unifigOptions };
}

export function showHelp(): void {
  console.log(`
unifig - File merge CLI tool with plugin system

USAGE:
  unifig <source> <destination> [options]
  unifig create-plugin <name>

COMMANDS:
  unifig <source> <destination>    Merge files from source to destination
  unifig create-plugin <name>      Create a new plugin template
  unifig --version                 Show version information
  unifig --help                    Show this help message

OPTIONS:
  -p, --pattern <pattern>          Glob pattern for file selection
  --plugin <plugin>                Plugin to use for transformation
  -d, --dry-run                    Preview changes without writing files
  -f, --force                      Overwrite existing files
  -i, --interactive                Interactive conflict resolution
  --create-dirs                    Create missing directories
  --parallel <number>              Number of parallel operations
  --verbose                        Verbose logging

EXAMPLES:
  unifig ./template ./my-project
  unifig https://github.com/user/template ./my-project --pattern "src/**/*.ts"
  unifig ./source ./dest --plugin template-variables --dry-run
  unifig ./source ./dest --interactive --force
`);
}

export function showVersion(): void {
  console.log('unifig v1.0.0');
}