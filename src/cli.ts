#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { readdirSync, statSync, copyFileSync } from "fs";
import meow from "meow";
import configMapData from "../configmap.yml" with { type: "yaml" };

interface ConfigMapping {
  [agent: string]: Array<{
    filePath: string;
    type: string;
    unifigPath: string;
    purpose: string;
  }>;
}

// Load configmap from bundled YAML import
function loadConfigMap(): ConfigMapping {
  const parsed = configMapData as Record<string, unknown>;

  // Extract agent configurations from the parsed YAML
  const agents: ConfigMapping = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (
      key !== "apiVersion" &&
      key !== "kind" &&
      key !== "metadata" &&
      Array.isArray(value)
    ) {
      agents[key] = value as Array<{
        filePath: string;
        type: string;
        unifigPath: string;
        purpose: string;
      }>;
    }
  }
  return agents;
}

// Resolve glob patterns to actual files
function resolveGlobPattern(baseDir: string, pattern: string): string[] {
  const parts = pattern.split("*");
  if (parts.length === 1) {
    // No wildcard, simple path
    const fullPath = join(baseDir, pattern);
    return existsSync(fullPath) ? [fullPath] : [];
  }

  const prefixPath = parts[0] || "";
  const dirPath = prefixPath ? join(baseDir, prefixPath) : baseDir;

  if (!existsSync(dirPath)) {
    return [];
  }

  const stat = statSync(dirPath);
  const directory = stat.isDirectory() ? dirPath : dirname(dirPath);
  const suffix = parts[parts.length - 1] || "";

  try {
    const files = readdirSync(directory);
    return files
      .filter((file) => !suffix || file.endsWith(suffix))
      .map((file) => join(directory, file));
  } catch {
    return [];
  }
}

// Scan directories for .unifig files
function scanForUnifigFiles(
  startDir: string,
  nested: boolean
): Map<string, string[]> {
  const unifigFiles = new Map<string, string[]>();

  function scan(dir: string) {
    const unifigPath = join(dir, ".unifig");
    if (existsSync(unifigPath)) {
      const files = readdirSync(unifigPath);
      unifigFiles.set(unifigPath, files.map((f) => join(unifigPath, f)));
    }

    if (nested) {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory() && !entry.startsWith(".")) {
          scan(fullPath);
        }
      }
    }
  }

  scan(startDir);
  return unifigFiles;
}

// Parse agent list string (e.g., "claude,copilot" or "all")
function parseAgentList(agentString: string): string[] {
  const agentAliases: { [key: string]: string } = {
    claude: "claude-code",
    "claude-code": "claude-code",
    claude_code: "claude-code",
    opencode: "opencode",
    codex: "openai-codex",
    "openai-codex": "openai-codex",
    openai_codex: "openai-codex",
    gemini: "gemini-cli",
    "gemini-cli": "gemini-cli",
    gemini_cli: "gemini-cli",
    copilot: "github-copilot",
    "github-copilot": "github-copilot",
    github_copilot: "github-copilot",
    cursor: "cursor",
    crush: "crush-cli",
    "crush-cli": "crush-cli",
    crush_cli: "crush-cli",
    continue: "continue-dev",
    "continue-dev": "continue-dev",
    continue_dev: "continue-dev",
    cline: "cline-cli",
    "cline-cli": "cline-cli",
    cline_cli: "cline-cli",
  };

  if (agentString === "all") {
    return [
      "claude-code",
      "opencode",
      "openai-codex",
      "gemini-cli",
      "github-copilot",
      "cursor",
      "crush-cli",
      "continue-dev",
      "cline-cli",
    ];
  }

  return agentString
    .split(",")
    .map((a) => {
      const normalized = a.trim().toLowerCase();
      return agentAliases[normalized] || normalized;
    });
}

// Apply configurations for selected agents
async function applyConfigurations(
  agents: string[],
  nested: boolean,
  configMap: ConfigMapping
) {
  const startDir = process.cwd();
  const unifigFiles = scanForUnifigFiles(startDir, nested);

  if (unifigFiles.size === 0) {
    console.log(
      "No .unifig directories found. Use 'unifig init' to create one."
    );
    return;
  }

  let copiedCount = 0;
  let skippedCount = 0;

  for (const [unifigPath, files] of unifigFiles.entries()) {
    const projectRoot = dirname(unifigPath);

    for (const agent of agents) {
      const agentConfigs = configMap[agent];
      if (!agentConfigs) {
        console.warn(`Warning: Unknown agent '${agent}'`);
        continue;
      }

      for (const config of agentConfigs) {
        const resolvedSources = resolveGlobPattern(
          unifigPath,
          config.unifigPath
        );

        for (const source of resolvedSources) {
          // Determine target path - handle glob patterns in filePath
          let targetPath: string;
          const hasGlob = config.filePath.includes("*");

          if (hasGlob) {
            // If filePath has glob pattern, replace the entire glob (*.*) with the source filename
            const sourceFilename = source.split("/").pop() || source;
            // Replace glob patterns like *.md or * with the actual filename
            const globPattern = /\*[^/]*/; // Match * followed by extension (e.g., *.md)
            targetPath = join(
              projectRoot,
              config.filePath.replace(globPattern, sourceFilename)
            );
          } else {
            // If filePath is a literal path, use it as-is
            targetPath = join(projectRoot, config.filePath);
          }

          const targetDir = dirname(targetPath);

          if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
          }

          try {
            copyFileSync(source, targetPath);
            copiedCount++;
            console.log(
              `✓ ${agent}: ${source.replace(projectRoot, ".")} → ${targetPath.replace(projectRoot, ".")}`
            );
          } catch (error) {
            skippedCount++;
            console.error(
              `✗ Failed to copy ${source}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      }
    }
  }

  console.log(`\nApplied: ${copiedCount} files, Skipped: ${skippedCount} files`);
}

// Initialize a new .unifig directory
async function initUnifig() {
  const startDir = process.cwd();
  const unifigDir = join(startDir, ".unifig");

  if (existsSync(unifigDir)) {
    console.log(`.unifig directory already exists at ${unifigDir}`);
    return;
  }

  mkdirSync(unifigDir, { recursive: true });
  mkdirSync(join(unifigDir, "commands"), { recursive: true });
  mkdirSync(join(unifigDir, "agents"), { recursive: true });

  // Create example files
  const exampleCommand = `# Example Command
description: This is an example command for Claude Code
`;

  const exampleAgent = `# Example Agent
description: This is an example agent configuration
instructions: |
  - Be helpful
  - Be clear
  - Be concise
`;

  const exampleSettings = `{
  "description": "Project-specific settings",
  "version": "1.0.0"
}
`;

  writeFileSync(
    join(unifigDir, "commands", "example.md"),
    exampleCommand
  );
  writeFileSync(
    join(unifigDir, "agents", "example.md"),
    exampleAgent
  );
  writeFileSync(
    join(unifigDir, "settings.json"),
    exampleSettings
  );

  console.log(`✓ Initialized .unifig directory at ${unifigDir}`);
  console.log(`  - Created commands/ directory`);
  console.log(`  - Created agents/ directory`);
  console.log(`  - Created example files`);
  console.log(`\nNext steps:`);
  console.log(
    `  1. Add your configuration files to .unifig/commands/ and .unifig/agents/`
  );
  console.log(`  2. Run: unifig apply --nested --agent all`);
}

// Clean .unifig directories
async function cleanUnifig(nested: boolean) {
  const startDir = process.cwd();
  let deletedCount = 0;
  let skippedCount = 0;

  function deleteRecursive(dirPath: string) {
    if (!existsSync(dirPath)) {
      return;
    }

    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        deleteRecursive(fullPath);
        try {
          if (readdirSync(fullPath).length === 0) {
            rmSync(fullPath, { recursive: true });
          }
        } catch {
          // Directory not empty or already deleted
        }
      } else {
        try {
          rmSync(fullPath, { force: true });
        } catch (error) {
          console.error(`Failed to delete file ${fullPath}: ${error}`);
        }
      }
    }
  }

  function scan(dir: string) {
    const unifigPath = join(dir, ".unifig");
    if (existsSync(unifigPath)) {
      try {
        deleteRecursive(unifigPath);
        rmSync(unifigPath, { recursive: true, force: true });
        deletedCount++;
        console.log(`✓ Removed .unifig directory at ${unifigPath}`);
      } catch (error) {
        skippedCount++;
        console.error(
          `✗ Failed to remove .unifig at ${unifigPath}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    if (nested) {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory() && !entry.startsWith(".")) {
          scan(fullPath);
        }
      }
    }
  }

  scan(startDir);
  console.log(`\nCleaned: ${deletedCount} directories, Skipped: ${skippedCount} directories`);
}

// Main CLI setup with meow
const cli = meow(
  `
Usage
  $ unifig [command] [options]

Commands
  apply     Apply .unifig configurations to supported agents
  init      Initialize a new .unifig directory
  clean     Clean .unifig directories

Options for 'apply':
  --nested  Scan nested directories recursively
  --agent   Target agent(s): comma-separated or "all"
            Examples: "claude", "claude,copilot", "all"

Options for 'clean':
  --nested  Remove .unifig directories recursively

Examples
  $ unifig apply --nested --agent all
  $ unifig apply --agent claude,copilot
  $ unifig init
  $ unifig clean --nested
  $ unifig clean
`,
  {
    importMeta: import.meta,
    flags: {
      nested: {
        type: "boolean",
        default: false,
        description: "Scan nested directories recursively",
      },
      agent: {
        type: "string",
        description:
          "Target agent(s): comma-separated list or 'all'",
      },
    },
  }
);

async function run() {
  const command = cli.input[0];

  try {
    if (!command || command === "help") {
      console.log(cli.help);
      process.exit(0);
    }

    if (command === "init") {
      await initUnifig();
    } else if (command === "apply") {
      if (!cli.flags.agent) {
        console.error(
          'Error: --agent flag is required for "apply" command'
        );
        console.log("\nUsage: unifig apply --agent <agent> [--nested]");
        process.exit(1);
      }

      const configMap = loadConfigMap();
      const agents = parseAgentList(cli.flags.agent);
      await applyConfigurations(agents, cli.flags.nested, configMap);
    } else if (command === "clean") {
      await cleanUnifig(cli.flags.nested);
    } else {
      console.error(`Unknown command: ${command}`);
      console.log("\nUse --help for usage information");
      process.exit(1);
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

run();
