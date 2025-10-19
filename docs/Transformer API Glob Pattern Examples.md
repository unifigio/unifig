# Transformer API & Glob Pattern Examples

## Transformer API Specification

### Core Transformer Interface

```typescript
interface Transformer {
  // Unique identifier
  name: string;
  
  // Version for compatibility checking
  version: string;
  
  // Transformation function
  transform: TransformFunction;
  
  // File matching strategy
  match: Matcher;
  
  // Optional features
  options?: TransformerOptions;
}

type TransformFunction = (
  content: string | Buffer,
  context: TransformContext
) => Promise<TransformResult> | TransformResult;

type Matcher = 
  | string                    // Glob pattern
  | string[]                  // Multiple glob patterns
  | RegExp                    // Regular expression
  | ((path: string) => boolean); // Custom function

interface TransformerOptions {
  // Processing order (higher = earlier)
  priority?: number;
  
  // Skip binary files
  skipBinary?: boolean;
  
  // Max file size to process (bytes)
  maxSize?: number;
  
  // File encoding
  encoding?: BufferEncoding;
  
  // Preserve file mode/permissions
  preserveMode?: boolean;
  
  // Continue on error
  continueOnError?: boolean;
}

interface TransformResult {
  // New file path (can rename/move files)
  destination: string;
  
  // Transformed content (null = skip file)
  content: string | Buffer | null;
  
  // Multiple output files from single input
  additionalFiles?: Array<{
    destination: string;
    content: string | Buffer;
  }>;
  
  // Metadata to pass to next transformer
  metadata?: Record<string, any>;
  
  // File mode (permissions)
  mode?: number;
  
  // Encoding for text files
  encoding?: BufferEncoding;
}
```

## Glob Pattern Examples

### Basic Patterns

```typescript
// All JavaScript files
'**/*.js'

// All TypeScript files including .d.ts
'**/*.{ts,tsx,d.ts}'

// All config files in root
'*.{json,yaml,yml,toml}'

// All files in src directory
'src/**/*'

// All test files
'**/*.{test,spec}.{js,ts,jsx,tsx}'

// All markdown files except README
'**/*.md:!README.md'
```

### Advanced Patterns

```typescript
// Complex project structure patterns
const patterns = {
  // Source code
  source: 'src/**/!(*.test|*.spec).{js,ts,jsx,tsx}',
  
  // Tests
  tests: '**/__tests__/**/*.{js,ts,jsx,tsx}',
  
  // Documentation
  docs: '{docs,documentation}/**/*.{md,mdx}',
  
  // Configuration
  config: '{*.config.{js,ts},config/**/*}',
  
  // Assets
  assets: '**/*.{png,jpg,jpeg,gif,svg,ico,webp}',
  
  // Styles
  styles: '**/*.{css,scss,sass,less,styl}',
  
  // Data files
  data: '**/*.{json,yaml,yml,csv,xml}',
  
  // Environment files
  env: '.env{,.local,.development,.production,.test}',
  
  // Package files
  packages: '{package.json,*.lock,*.lockb}',
  
  // Hidden files (Unix)
  hidden: '**/.*',
  
  // Temporary files
  temp: '**/*.{tmp,temp,cache,swp,*~}',
};
```

### Negation and Exclusion Patterns

```typescript
// Include all JS but exclude node_modules and dist
['**/*.js', '!node_modules/**', '!dist/**']

// All files except tests and docs
['**/*', '!**/*.test.*', '!**/*.spec.*', '!docs/**']

// Source files excluding generated ones
['src/**/*', '!src/**/*.generated.*', '!src/**/*.auto.*']
```

## Built-in Transformer Examples

### 1. Template Variable Transformer

```typescript
const templateTransformer: Transformer = {
  name: 'template-variables',
  version: '1.0.0',
  match: '**/*.template.*',
  
  async transform(content, context) {
    const variables = {
      PROJECT_NAME: context.variables.projectName,
      AUTHOR: context.variables.author,
      DATE: new Date().toISOString(),
      YEAR: new Date().getFullYear(),
      ...process.env, // Include environment variables
    };
    
    let processed = content.toString();
    
    // Replace {{VARIABLE}} patterns
    processed = processed.replace(
      /\{\{(\w+)\}\}/g,
      (match, key) => variables[key] || match
    );
    
    // Remove .template from filename
    const destination = context.destinationPath.replace('.template', '');
    
    return { destination, content: processed };
  }
};
```

### 2. Import Path Transformer

```typescript
const importPathTransformer: Transformer = {
  name: 'import-paths',
  version: '1.0.0',
  match: ['**/*.{js,ts,jsx,tsx}'],
  
  async transform(content, context) {
    const { oldPackageName, newPackageName } = context.variables;
    
    let processed = content.toString();
    
    // Update import statements
    processed = processed.replace(
      /from ['"](@?\w+\/[\w\-\/]+)['"]/g,
      (match, importPath) => {
        if (importPath.startsWith(oldPackageName)) {
          return match.replace(oldPackageName, newPackageName);
        }
        return match;
      }
    );
    
    // Update require statements
    processed = processed.replace(
      /require\(['"](@?\w+\/[\w\-\/]+)['"]\)/g,
      (match, importPath) => {
        if (importPath.startsWith(oldPackageName)) {
          return match.replace(oldPackageName, newPackageName);
        }
        return match;
      }
    );
    
    return {
      destination: context.destinationPath,
      content: processed,
    };
  }
};
```

### 3. JSON Schema Transformer

```typescript
const jsonSchemaTransformer: Transformer = {
  name: 'json-schema',
  version: '1.0.0',
  match: '**/schema.json',
  
  async transform(content, context) {
    const schema = JSON.parse(content.toString());
    
    // Add common properties
    schema.$schema = schema.$schema || 'http://json-schema.org/draft-07/schema#';
    schema.$id = schema.$id || `${context.variables.baseUrl}/schemas/${path.basename(context.sourcePath)}`;
    
    // Add metadata
    schema.metadata = {
      generated: new Date().toISOString(),
      generator: 'unifig',
      source: context.sourcePath,
    };
    
    return {
      destination: context.destinationPath,
      content: JSON.stringify(schema, null, 2),
    };
  }
};
```

### 4. File Splitter Transformer

```typescript
const fileSplitterTransformer: Transformer = {
  name: 'file-splitter',
  version: '1.0.0',
  match: '**/*.combined.{js,ts}',
  
  async transform(content, context) {
    const sections = content.toString().split('// --- SPLIT ---');
    
    if (sections.length <= 1) {
      return {
        destination: context.destinationPath,
        content,
      };
    }
    
    const baseName = path.basename(context.destinationPath, path.extname(context.destinationPath));
    const ext = path.extname(context.destinationPath);
    const dir = path.dirname(context.destinationPath);
    
    // First section becomes main file
    const mainFile = {
      destination: path.join(dir, `${baseName.replace('.combined', '')}${ext}`),
      content: sections[0].trim(),
    };
    
    // Additional sections become separate files
    const additionalFiles = sections.slice(1).map((section, index) => ({
      destination: path.join(dir, `${baseName}-part${index + 1}${ext}`),
      content: section.trim(),
    }));
    
    return {
      ...mainFile,
      additionalFiles,
    };
  }
};
```

### 5. Markdown Processor Transformer

```typescript
const markdownProcessorTransformer: Transformer = {
  name: 'markdown-processor',
  version: '1.0.0',
  match: '**/*.md',
  options: {
    skipBinary: true,
    encoding: 'utf-8',
  },
  
  async transform(content, context) {
    let processed = content.toString();
    
    // Extract frontmatter
    const frontmatterMatch = processed.match(/^---\n([\s\S]*?)\n---/);
    let frontmatter = {};
    
    if (frontmatterMatch) {
      // Parse YAML frontmatter
      frontmatter = parseYAML(frontmatterMatch[1]);
      processed = processed.slice(frontmatterMatch[0].length);
    }
    
    // Auto-generate table of contents
    const headings = processed.match(/^#{1,6} .+$/gm) || [];
    const toc = headings.map(h => {
      const level = h.match(/^#+/)[0].length;
      const text = h.replace(/^#+\s+/, '');
      const indent = '  '.repeat(level - 1);
      const anchor = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return `${indent}- [${text}](#${anchor})`;
    }).join('\n');
    
    // Insert TOC after frontmatter
    if (toc && processed.includes('<!-- TOC -->')) {
      processed = processed.replace('<!-- TOC -->', `<!-- TOC -->\n${toc}\n<!-- /TOC -->`);
    }
    
    // Update metadata
    frontmatter.updated = new Date().toISOString();
    frontmatter.generator = 'unifig';
    
    // Rebuild with frontmatter
    const finalContent = `---\n${stringifyYAML(frontmatter)}---\n${processed}`;
    
    return {
      destination: context.destinationPath,
      content: finalContent,
      metadata: frontmatter,
    };
  }
};
```

### 6. Environment Variable Injector

```typescript
const envInjectorTransformer: Transformer = {
  name: 'env-injector',
  version: '1.0.0',
  match: ['**/*.env.example', '**/*.env.template'],
  
  async transform(content, context) {
    let processed = content.toString();
    const lines = processed.split('\n');
    
    const processedLines = lines.map(line => {
      // Skip comments and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        return line;
      }
      
      const [key, value] = line.split('=');
      if (!key) return line;
      
      // Check if environment variable exists
      const envValue = process.env[key.trim()];
      
      if (envValue !== undefined) {
        return `${key.trim()}=${envValue}`;
      }
      
      // Use default value or placeholder
      return `${key.trim()}=${value || `{{${key.trim()}}}`}`;
    });
    
    // Remove .example or .template from filename
    const destination = context.destinationPath
      .replace('.example', '')
      .replace('.template', '');
    
    return {
      destination,
      content: processedLines.join('\n'),
    };
  }
};
```

## Transformer Chaining Example

```typescript
// Define transformation pipeline
const pipeline = [
  {
    pattern: '**/*.template.ts',
    transformers: [
      'template-variables',    // First: replace variables
      'import-paths',          // Then: update imports
      'prettier',              // Finally: format code
    ],
  },
  {
    pattern: '**/*.{json,yaml}',
    transformers: [
      'schema-validator',      // Validate structure
      'env-injector',         // Inject env vars
      'minifier',             // Minify for production
    ],
  },
];

// Execute pipeline
async function executePipeline(file: File, pipeline: Pipeline) {
  let content = file.content;
  let metadata = {};
  
  for (const transformer of pipeline.transformers) {
    const result = await transformer.transform(content, {
      ...context,
      metadata, // Pass metadata between transformers
    });
    
    if (result.content === null) {
      // Transformer chose to skip file
      return null;
    }
    
    content = result.content;
    metadata = { ...metadata, ...result.metadata };
  }
  
  return { content, metadata };
}
```

## Pattern Matching Best Practices

1. **Specificity**: More specific patterns should have higher priority
2. **Exclusions**: Always exclude `node_modules`, `.git`, `dist`, `build`
3. **Performance**: Use specific paths when possible (`src/**` vs `**`)
4. **Ordering**: Process dependencies before dependents
5. **Grouping**: Group related patterns together for clarity

```typescript
const recommendedPatterns = {
  // Highest priority: Critical config files
  critical: {
    patterns: ['package.json', 'tsconfig.json', '.env'],
    priority: 100,
  },
  
  // High priority: Source code
  source: {
    patterns: ['src/**/*.{ts,tsx,js,jsx}'],
    priority: 80,
  },
  
  // Medium priority: Tests
  tests: {
    patterns: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],
    priority: 50,
  },
  
  // Low priority: Documentation
  docs: {
    patterns: ['**/*.{md,mdx}'],
    priority: 20,
  },
  
  // Lowest priority: Assets
  assets: {
    patterns: ['**/*.{png,jpg,svg,ico}'],
    priority: 10,
  },
};
```