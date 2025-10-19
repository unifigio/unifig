# Plugin System Design & API Specification

## Plugin Architecture

### Plugin Types

1. **Core Plugins** (Bundled with CLI)
   - Template variable replacement
   - Environment variable injection
   - JSON/YAML transformation
   - Markdown processing

2. **Local Plugins** (User filesystem)
   - Located in `~/.unifig/plugins/`
   - Direct TypeScript/JavaScript files
   - Hot-reloadable during development

3. **NPM Plugins** (Package registry)
   - Named pattern: `@unifig/plugin-*` or `unifig-plugin-*`
   - Installed globally or locally
   - Version management through npm

## Plugin API Specification

### Basic Plugin Structure

```typescript
import type { Plugin, TransformContext, TransformResult } from '@unifig/types';

export default {
  name: 'my-transformer',
  version: '1.0.0',
  description: 'Transforms files in a specific way',
  
  // Matcher function or glob pattern
  match: (filePath: string) => boolean,
  // or
  match: '**/*.template.js',
  
  // Main transformation function
  async transform(
    content: string,
    context: TransformContext
  ): Promise<TransformResult> {
    // Transform logic here
    return {
      destination: context.destinationPath,
      content: transformedContent,
    };
  },
  
  // Optional lifecycle hooks
  hooks: {
    beforeTransform?: async (context) => void,
    afterTransform?: async (result, context) => void,
    onError?: async (error, context) => void,
  },
  
  // Optional configuration schema
  config: {
    schema: {
      // JSON Schema for plugin configuration
    },
    defaults: {
      // Default configuration values
    }
  }
} satisfies Plugin;
```

### Advanced Plugin Features

```typescript
interface AdvancedPlugin extends Plugin {
  // Priority for transform order (higher = earlier)
  priority?: number;
  
  // Dependencies on other plugins
  requires?: string[];
  
  // Capability declarations
  capabilities?: {
    streaming?: boolean;      // Supports stream processing
    concurrent?: boolean;     // Thread-safe for parallel execution
    incremental?: boolean;    // Supports incremental updates
  };
  
  // Resource requirements
  resources?: {
    maxMemory?: number;      // Max memory in MB
    timeout?: number;        // Timeout in ms
  };
  
  // Multiple transformers in one plugin
  transformers?: Array<{
    name: string;
    match: Matcher;
    transform: TransformFunction;
  }>;
}
```

## Plugin Development Experience

### 1. Plugin Generator CLI

```bash
# Create a new plugin from template
unifig create-plugin my-transformer

# Generates:
my-transformer/
├── src/
│   └── index.ts         # Plugin implementation
├── test/
│   └── index.test.ts    # Tests
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── README.md           # Documentation
```

### 2. Development Mode

```bash
# Watch mode for plugin development
unifig dev --plugin ./my-transformer

# Test plugin with sample files
unifig test-plugin ./my-transformer --input ./samples
```

### 3. Plugin Helpers

```typescript
// Built-in utilities for plugin developers
import { 
  parseJSON,
  parseYAML,
  template,
  glob,
  logger,
  cache
} from '@unifig/helpers';

export default {
  name: 'json-transformer',
  match: '**/*.json',
  
  async transform(content, context) {
    const data = parseJSON(content);
    
    // Use template helper for variable replacement
    const processed = template(JSON.stringify(data), {
      PROJECT_NAME: context.variables.projectName,
      DATE: new Date().toISOString(),
    });
    
    // Use cache helper for expensive operations
    const cached = await cache.get(context.sourcePath);
    if (cached) return cached;
    
    // Log progress
    logger.info(`Processing ${context.sourcePath}`);
    
    return {
      destination: context.destinationPath.replace('.json', '.processed.json'),
      content: processed,
    };
  }
};
```

## Plugin Lifecycle

```
1. Discovery     → Find all available plugins
2. Loading       → Import and validate plugins
3. Registration  → Register with transformation engine
4. Matching      → Match files to plugins
5. Execution     → Run transformations
6. Cleanup       → Post-processing hooks
```

## Plugin Communication

### Inter-Plugin Communication

```typescript
interface PluginContext {
  // Share data between plugins
  shared: Map<string, any>;
  
  // Emit events to other plugins
  emit(event: string, data: any): void;
  
  // Listen to events from other plugins
  on(event: string, handler: Function): void;
  
  // Call another plugin directly
  call(pluginName: string, method: string, ...args): Promise<any>;
}
```

### Example: Chained Transformations

```typescript
// Plugin A: Extract metadata
export default {
  name: 'metadata-extractor',
  match: '**/*.md',
  
  async transform(content, context) {
    const metadata = extractFrontmatter(content);
    
    // Share metadata with other plugins
    context.shared.set(`metadata:${context.sourcePath}`, metadata);
    
    return {
      destination: context.destinationPath,
      content: removeFrontmatter(content),
    };
  }
};

// Plugin B: Use metadata
export default {
  name: 'template-injector',
  match: '**/*.md',
  requires: ['metadata-extractor'],
  
  async transform(content, context) {
    // Retrieve metadata from Plugin A
    const metadata = context.shared.get(`metadata:${context.sourcePath}`);
    
    return {
      destination: context.destinationPath,
      content: injectTemplate(content, metadata),
    };
  }
};
```

## Plugin Testing

```typescript
import { createTestHarness } from '@unifig/testing';
import myPlugin from './index';

describe('My Plugin', () => {
  const harness = createTestHarness(myPlugin);
  
  test('transforms correctly', async () => {
    const result = await harness.transform(
      'input content',
      {
        sourcePath: 'test.js',
        destinationPath: 'output.js',
      }
    );
    
    expect(result.content).toBe('expected output');
  });
  
  test('skips files correctly', async () => {
    const result = await harness.transform('skip me', {
      sourcePath: 'ignore.txt',
      destinationPath: 'ignore.txt',
    });
    
    expect(result.content).toBeNull();
  });
});
```

## Plugin Distribution

### Publishing to NPM

```json
{
  "name": "unifig-plugin-scss",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["unifig-plugin"],
  "peerDependencies": {
    "@unifig/types": "^1.0.0"
  }
}
```

### Plugin Registry

```typescript
// Automatic discovery via naming convention
const discoverPlugins = async () => {
  const plugins = [];
  
  // 1. Core plugins
  plugins.push(...corePlugins);
  
  // 2. Local plugins
  const localDir = path.join(os.homedir(), '.unifig/plugins');
  plugins.push(...await loadLocalPlugins(localDir));
  
  // 3. NPM plugins (global and local)
  plugins.push(...await findNpmPlugins(/^(@unifig\/plugin-|unifig-plugin-)/));
  
  return plugins;
};
```