![unifig Banner](assets/banner.png)

# unifig - Unified Configuration Manager

**unifig** is a powerful CLI tool that intelligently merges files from source directories or git repositories into target projects with transformation capabilities. Perfect for scaffolding new projects, applying templates, and managing configuration across multiple environments.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-org/unifig)
[![Built with Bun](https://img.shields.io/badge/built%20with-bun-orange.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Quick Start

### Install
```bash
# Download the latest binary for your platform
curl -fsSL https://github.com/your-org/unifig/releases/latest/download/unifig-$(uname -s)-$(uname -m) -o unifig
chmod +x unifig
sudo mv unifig /usr/local/bin/
```

### Basic Usage
```bash
# Copy all files from a template directory
unifig ./my-template ./my-project

# Use a git repository as source
unifig https://github.com/user/template ./my-project

# Apply transformations with environment variables
PROJECT_NAME=MyApp VERSION=1.0.0 unifig ./template ./project
```

## 🚀 Features

- **📁 Multiple Sources**: Local directories or git repositories
- **🔍 Smart Filtering**: Glob patterns for selective file copying
- **🔧 Template Engine**: Variable substitution with defaults (`{{VAR:default}}`)
- **🔌 Plugin System**: Extensible transformation pipeline
- **⚡ Fast & Efficient**: Built with Bun, handles large repositories
- **🛡️ Safe Operations**: Dry-run mode and conflict resolution
- **🎯 Zero Config**: Works out of the box, highly configurable when needed

## 📦 Installation

### Pre-built Binaries
Download the latest release from [GitHub Releases](https://github.com/your-org/unifig/releases).

### Build from Source
```bash
git clone https://github.com/your-org/unifig.git
cd unifig
bun install
bun run build
```

## 📖 Usage

### Basic Commands

```bash
# Show help
unifig --help

# Show version
unifig --version

# Create a new plugin
unifig create-plugin my-plugin
```

### File Merging

```bash
unifig <source> <destination> [options]
```

**Examples:**

```bash
# Basic file copying
unifig ./template ./my-project

# From git repository
unifig https://github.com/user/template ./my-project

# Selective copying with patterns
unifig ./source ./dest --pattern "src/**/*.ts" --pattern "!**/*.test.ts"

# Template processing with variables
PROJECT_NAME=MyApp AUTHOR="John Doe" unifig ./template ./project

# Dry run to preview changes
unifig ./source ./dest --dry-run --verbose

# Force overwrite existing files
unifig ./source ./dest --force

# Interactive conflict resolution
unifig ./source ./dest --interactive
```

### Template Variables

unifig supports variable substitution in template files (`.template` extension):

```bash
# In your template files
{{PROJECT_NAME}}
{{VERSION:1.0.0}}  # With default value
{{AUTHOR}}
```

```bash
# Set variables via environment
PROJECT_NAME=MyApp VERSION=2.0.0 unifig ./template ./project
```

### Pattern Matching

Use glob patterns to include/exclude files:

```bash
# Include only TypeScript files
unifig ./source ./dest --pattern "**/*.ts"

# Exclude test files
unifig ./source ./dest --pattern "**/*" --pattern "!**/*.test.*"

# Multiple patterns
unifig ./source ./dest \
  --pattern "src/**/*" \
  --pattern "config/**/*" \
  --pattern "!**/*.log"
```

## 🔌 Plugin System

unifig's power comes from its extensible plugin system. Plugins can transform files during the merge process.

### Built-in Plugins

- **template-variables**: Replace `{{VAR}}` and `{{VAR:default}}` in `.template` files
- **env-injector**: Inject environment variables into files
- **import-paths**: Update import/require statements to match new project structure

### Using Plugins

```bash
# Use specific plugins
unifig ./source ./dest --plugin template-variables --plugin import-paths

# Plugin with custom configuration
unifig ./source ./dest --plugin my-custom-plugin
```

---

## 🛠️ Developer Guide

### Architecture Overview

unifig follows a modular architecture with clear separation of concerns:

```
CLI Parser → Pipeline Manager → Source Reader
                              → Plugin Loader
                              → Glob Matcher
                              → Transformation Engine → File Writer
```

**Core Components:**
- **Source Reader**: Handles local directories and git repositories
- **Plugin System**: Discovers, loads, and executes transformation plugins
- **Glob Matcher**: Filters files based on patterns
- **Transformation Engine**: Applies plugins to matched files
- **File Writer**: Handles output with conflict resolution

### Plugin API

Create powerful transformations with the plugin API:

```typescript
import type { Plugin, TransformContext, TransformResult } from '@unifig/types';

export default {
  name: 'my-transformer',
  version: '1.0.0',
  description: 'Custom file transformer',

  // Match files to transform
  match: '**/*.js', // or use a function

  // Transform function
  async transform(content: string, context: TransformContext): Promise<TransformResult> {
    // Your transformation logic
    const transformed = content.replace(/old/g, 'new');

    return {
      destination: context.destinationPath,
      content: transformed,
    };
  },
} satisfies Plugin;
```

### Plugin Types

```typescript
interface Plugin {
  name: string;
  version: string;
  description?: string;
  match: string | string[] | RegExp | ((path: string) => boolean);
  transform: (content: string | Buffer, context: TransformContext) => Promise<TransformResult>;
  priority?: number; // Execution order
  requires?: string[]; // Dependencies
}

interface TransformContext {
  sourcePath: string;
  destinationPath: string;
  fileStats: FileStats;
  options: unifigOptions;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

interface TransformResult {
  destination: string;
  content: string | Buffer | null; // null = skip file
  metadata?: Record<string, any>;
  additionalFiles?: Array<{
    destination: string;
    content: string | Buffer;
  }>;
}
```

### Creating Plugins

```bash
# Generate a new plugin
unifig create-plugin my-plugin

# This creates:
my-plugin/
├── src/index.ts      # Plugin implementation
├── test/index.test.ts # Tests
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
└── README.md         # Documentation
```

### Plugin Development Workflow

```bash
# Test your plugin during development
unifig dev --plugin ./my-plugin --source ./test-files

# Run plugin tests
bun test

# Build for distribution
bun run build
```

### Publishing Plugins

```bash
# NPM package naming convention
npm publish --name unifig-plugin-my-transformer
# or
npm publish --name @unifig/plugin-my-transformer
```

### Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test test/integration.test.ts

# Watch mode
bun test --watch
```

### Configuration Options

```typescript
interface unifigOptions {
  source: string;           // Source path or git URL
  destination: string;      // Target directory
  patterns?: string[];      // Glob patterns
  plugins?: string[];       // Plugin names
  dryRun?: boolean;         // Preview mode
  force?: boolean;          // Overwrite existing files
  interactive?: boolean;    // Interactive conflict resolution
  createDirs?: boolean;     // Create missing directories
  verbose?: boolean;        // Verbose logging
  parallel?: number;        // Concurrent operations
}
```

### Performance Considerations

- **Streaming**: Large files are processed in streams to minimize memory usage
- **Parallel Processing**: Transformations run concurrently when possible
- **Lazy Loading**: Plugins are loaded only when needed
- **Memory Limits**: Built-in safeguards prevent excessive memory usage

### Error Handling

unifig provides comprehensive error handling:
- Graceful degradation (continues processing other files on error)
- Detailed error messages with context
- Verbose logging for debugging
- Plugin isolation to prevent cascading failures

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests**: `bun test`
6. **Submit a pull request**

### Development Setup

```bash
git clone https://github.com/your-org/unifig.git
cd unifig
bun install
bun run build
bun test
```

### Code Style

- Use TypeScript for all new code
- Follow existing patterns and conventions
- Add JSDoc comments for public APIs
- Write comprehensive tests

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](docs/)
- [GitHub Repository](https://github.com/your-org/unifig)
- [Issue Tracker](https://github.com/your-org/unifig/issues)
- [Plugin Registry](https://github.com/your-org/unifig-plugins)

---

*Built with ❤️ using [Bun](https://bun.sh)*
