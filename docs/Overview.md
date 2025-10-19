# Build Prompt: File Merge CLI (Project Unifig) with Plugin System

## Project Overview
Build a CLI tool using Bun runtime (with `--compile` for bundled executables) that intelligently merges files from source directories or git repositories into target projects with transformation capabilities.

## Core Requirements

### File Operations
- Accept source: local directory path OR git repository URL
- Copy files to destination with relative path preservation
- Support glob patterns for selective file copying
- Create missing directories (with --create-dirs flag)
- Handle conflicts: skip, overwrite, or interactive mode

### Plugin System
- **Plugin Types**: 
  - Core plugins (bundled)
  - Local plugins (`~/.unifig/plugins/`)
  - NPM plugins (`@unifig/plugin-*` or `unifig-plugin-*`)
- **Plugin API**: Transformers that accept file content and return `{ destination: string, content: string | null }`
- **Capabilities**: Async transforms, file skipping (return null), file renaming, multiple output files from single input
- **Execution**: Run in Bun Worker threads for isolation and security

### Technical Architecture
```typescript
interface unifigOptions {
  source: string;          // Path or git URL
  destination: string;     // Target directory
  patterns?: string[];     // Glob patterns
  plugins?: string[];      // Plugin names to load
  dryRun?: boolean;       // Preview without writing
  force?: boolean;        // Overwrite existing files
}

interface Plugin {
  name: string;
  version: string;
  match: string | string[] | RegExp | ((path: string) => boolean);
  transform: (content: string, context: TransformContext) => Promise<TransformResult>;
}

interface TransformResult {
  destination: string;
  content: string | Buffer | null;  // null = skip file
  metadata?: Record<string, any>;   // Pass data between plugins
}
```

## Implementation Priorities

### Phase 1: Core Functionality
1. CLI argument parser with these commands:
   ```bash
   unifig <source> <destination> [options]
   unifig --version
   unifig --help
   ```

2. Source handlers:
   - Git clone implementation (use Bun's built-in git)
   - Directory scanner with recursive file reading
   - Stream-based file reading (don't load entire files into memory)

3. Glob matcher using minimatch or similar
   - Support patterns like: `**/*.js`, `src/**/*`, `!node_modules/**`

4. Basic file writer with conflict detection

### Phase 2: Plugin System
1. Plugin loader that discovers and validates plugins
2. Plugin registry to manage loaded plugins
3. Transformation pipeline that:
   - Matches files to plugins based on patterns
   - Executes transformers in priority order
   - Handles errors gracefully (continue on error)

4. Core plugins to include:
   - `template-variables`: Replace `{{VAR}}` with values
   - `import-paths`: Update import/require statements
   - `env-injector`: Inject environment variables

### Phase 3: Developer Experience
1. Plugin development mode:
   ```bash
   unifig dev --plugin ./my-plugin --source ./test-files
   ```

2. Plugin generator:
   ```bash
   unifig create-plugin <name>
   ```

3. Progress indicators and verbose logging
4. Dry-run mode to preview changes

## Code Structure
```
src/
├── cli/
│   ├── index.ts           # Entry point
│   ├── parser.ts          # Argument parsing
│   └── commands/          # Command handlers
├── core/
│   ├── source-reader.ts   # Git/directory handling
│   ├── glob-matcher.ts    # Pattern matching
│   ├── file-writer.ts     # Output handling
│   └── pipeline.ts        # Main processing pipeline
├── plugins/
│   ├── loader.ts          # Plugin discovery/loading
│   ├── registry.ts        # Plugin management
│   ├── sandbox.ts         # Worker thread wrapper
│   └── core/              # Built-in plugins
└── utils/
    ├── stream.ts          # Stream utilities
    ├── logger.ts          # Logging system
    └── errors.ts          # Error handling
```

## Performance Requirements
- Handle repositories with 10,000+ files
- Stream processing for files larger than 100MB
- Parallel transformation using Worker threads
- Memory usage under 200MB for typical operations

## User Experience Goals
- Zero configuration for basic usage
- Clear, actionable error messages
- Interactive conflict resolution
- Progress indication for long operations
- Intuitive plugin discovery and installation

## Distribution
- Single executable via `bun build --compile`
- NPM package for plugin developers
- Homebrew formula for macOS
- GitHub releases with pre-built binaries

## Example Usage
```bash
# Basic usage
unifig ./template ./my-project

# From git with patterns
unifig https://github.com/user/template ./my-project --pattern "src/**/*.ts"

# With plugins and dry-run
unifig ./source ./dest --plugin @unifig/plugin-typescript --dry-run

# Interactive mode
unifig ./source ./dest --interactive --force
```

## Success Criteria
- Clean, maintainable TypeScript code
- 90%+ test coverage
- Plugin API that's intuitive and well-documented
- Performance: process 1,000 files in under 5 seconds
- Memory efficient: handle 1GB repositories without crashing