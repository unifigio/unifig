# File Unifig - Architecture Documentation

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                     CLI Entry Point                      │
│                    (Command Parser)                      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    Pipeline Manager                      │
│         (Orchestrates the entire flow)                   │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│ Source Reader │ │Plugin Loader│ │Glob Matcher│
│               │ │             │ │            │
└───────────────┘ └─────────────┘ └────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                 Transformation Engine                    │
│              (Applies plugins to files)                  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    File Writer                           │
│            (Conflict resolution & output)                │
└─────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Source Reader
- **Git Repository Handler**: Clones and reads from git repos
- **Local Directory Scanner**: Recursively scans local directories
- **Stream Provider**: Provides file streams instead of loading into memory

### 2. Plugin System
- **Plugin Discovery**: Finds plugins in:
  - Core plugins (bundled)
  - User directory (`~/.unifig/plugins/`)
  - NPM packages (`@unifig/plugin-*`)
- **Plugin Loader**: Dynamically imports and validates plugins
- **Plugin Registry**: Maintains loaded plugins and their metadata

### 3. Glob Matcher
- **Pattern Parser**: Parses and validates glob patterns
- **File Matcher**: Matches files against registered patterns
- **Priority Resolver**: Handles overlapping patterns

### 4. Transformation Engine
- **Pipeline Executor**: Runs transformations in order
- **Context Provider**: Supplies metadata to transformers
- **Error Handler**: Manages transformation failures

### 5. File Writer
- **Conflict Resolver**: Handles existing files
- **Directory Creator**: Creates missing directories
- **Atomic Writer**: Ensures safe file writes

## Data Flow

```
Source Files → Glob Matching → Transformer Selection → 
Transformation Pipeline → Validation → Output Writing
```

## Configuration

While the tool is "zero-config", it supports optional configuration through:

1. **CLI Arguments**: Override defaults
2. **Environment Variables**: `unifig_CLI_*` variables
3. **Plugin Manifests**: Plugin-specific configuration

## Type Definitions

```typescript
// Core types
interface unifigOptions {
  source: string;           // Path or git URL
  destination: string;      // Target directory
  patterns?: GlobPattern[]; // Glob patterns
  plugins?: string[];       // Plugin identifiers
  dryRun?: boolean;        // Preview mode
  force?: boolean;         // Overwrite existing
  parallel?: number;       // Concurrent operations
}

interface GlobPattern {
  pattern: string;
  transformer?: string;
  priority?: number;
}

interface TransformContext {
  sourcePath: string;
  destinationPath: string;
  fileStats: FileStats;
  options: unifigOptions;
  variables: Record<string, any>;
}

interface TransformResult {
  destination: string;
  content: string | Buffer | null; // null = skip file
  mode?: number;
  encoding?: BufferEncoding;
}

interface FileStats {
  size: number;
  modified: Date;
  created: Date;
  isDirectory: boolean;
  isSymlink: boolean;
}
```

## Performance Optimizations

1. **Streaming**: Process large files without loading into memory
2. **Parallel Processing**: Transform multiple files concurrently
3. **Lazy Loading**: Load plugins only when needed
4. **Incremental Updates**: Skip unchanged files (with --incremental flag)
5. **Memory Pool**: Reuse buffers for file operations

## Error Handling

- **Graceful Degradation**: Continue processing other files on error
- **Error Recovery**: Retry failed operations with backoff
- **Rollback Support**: Transaction-like file operations
- **Detailed Logging**: Verbose error messages with context

## Security Considerations

1. **Plugin Sandboxing**: Run plugins in isolated workers
2. **Permission Checks**: Verify write permissions before starting
3. **Path Traversal Prevention**: Sanitize all file paths
4. **Resource Limits**: Memory and CPU limits for plugins
5. **Audit Trail**: Log all file operations