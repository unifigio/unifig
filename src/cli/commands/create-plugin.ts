import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export async function createPlugin(pluginName: string): Promise<void> {
  const pluginDir = pluginName;

  // Create plugin directory structure
  await mkdir(join(pluginDir, 'src'), { recursive: true });
  await mkdir(join(pluginDir, 'test'), { recursive: true });

  // Create package.json
  const packageJson = {
    name: `unifig-plugin-${pluginName}`,
    version: '1.0.0',
    description: `Unifig plugin for ${pluginName}`,
    main: 'dist/index.js',
    type: 'module',
    scripts: {
      build: 'tsc',
      test: 'bun test',
    },
    devDependencies: {
      '@types/bun': 'latest',
      typescript: '^5.0.0',
    },
    peerDependencies: {
      '@unifig/types': '^1.0.0',
    },
    keywords: ['unifig-plugin'],
  };

  // Create tsconfig.json
  const tsconfigJson = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'node',
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      outDir: './dist',
      rootDir: './src',
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'test'],
  };

  // Create plugin source file
  const pluginSource = `import type { Plugin, TransformContext, TransformResult } from '@unifig/types';

export const ${pluginName}Plugin: Plugin = {
  name: '${pluginName}',
  version: '1.0.0',
  match: '**/*', // Match all files - customize as needed

  async transform(content: string | Buffer, context: TransformContext): Promise<TransformResult> {
    // TODO: Implement your transformation logic here
    console.log(\`Processing \${context.sourcePath}\`);

    // Example: Return the content unchanged
    return {
      destination: context.destinationPath,
      content,
    };
  },
};

export default ${pluginName}Plugin;
`;

  // Create test file
  const testSource = `import { describe, test, expect } from 'bun:test';
import { ${pluginName}Plugin } from '../src/index';

describe('${pluginName} Plugin', () => {
  test('should transform content', async () => {
    const result = await ${pluginName}Plugin.transform(
      'test content',
      {
        sourcePath: 'test.txt',
        destinationPath: 'output.txt',
        fileStats: {
          size: 12,
          modified: new Date(),
          created: new Date(),
          isDirectory: false,
          isSymlink: false,
        },
        options: {},
        variables: {},
      }
    );

    expect(result.content).toBeDefined();
    expect(result.destination).toBe('output.txt');
  });
});
`;

  // Create README
  const readme = `# ${pluginName}

A Unifig plugin for transforming files.

## Installation

\`\`\`bash
npm install unifig-plugin-${pluginName}
\`\`\`

## Usage

\`\`\`typescript
import ${pluginName}Plugin from 'unifig-plugin-${pluginName}';

// Use in unifig configuration
\`\`\`

## Development

\`\`\`bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build
\`\`\`
`;

  // Write all files
  await writeFile(join(pluginDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  await writeFile(join(pluginDir, 'tsconfig.json'), JSON.stringify(tsconfigJson, null, 2));
  await writeFile(join(pluginDir, 'README.md'), readme);
  await writeFile(join(pluginDir, 'src', 'index.ts'), pluginSource);
  await writeFile(join(pluginDir, 'test', 'index.test.ts'), testSource);

  console.log(`Plugin ${pluginName} created successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${pluginName}`);
  console.log(`  bun install`);
  console.log(`  bun test`);
  console.log(`  # Start developing your plugin`);
}