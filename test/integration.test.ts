import { test, expect, beforeAll, afterEach } from 'bun:test';
import { readdir, readFile, stat as fsStat, mkdir, rm } from 'fs/promises';
import { join, resolve } from 'path';

const CLI_PATH = resolve('./bin/unifig');
const TEST_FIXTURES = resolve('./test-fixtures');
const TEST_OUTPUT = resolve('./out/test-output');

// Helper function to run CLI commands
async function runCLI(args: string[], env?: Record<string, string>): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    // Quote arguments that contain special characters to prevent shell expansion
    const quotedArgs = args.map(arg => {
      if (arg.includes('*') || arg.includes('!') || arg.includes('?') || arg.includes('[')) {
        return `'${arg}'`;
      }
      return arg;
    });

    const envVars = env ? Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ') + ' ' : '';
    const command = `${envVars}${CLI_PATH} ${quotedArgs.join(' ')}`;

    const proc = Bun.spawn(['sh', '-c', command], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    return { stdout, stderr, exitCode };
  } catch (error: any) {
    return {
      stdout: '',
      stderr: error.message || '',
      exitCode: 1,
    };
  }
}

// Helper to clean output directory
async function cleanOutput() {
  try {
    await rm(TEST_OUTPUT, { recursive: true, force: true });
  } catch {
    // Directory might not exist
  }
  await mkdir(TEST_OUTPUT, { recursive: true });
}

beforeAll(async () => {
  // Ensure CLI is built
  try {
    await Bun.$`bun run build`;
  } catch (error) {
    throw new Error('Failed to build CLI before running tests');
  }
});

afterEach(async () => {
  await cleanOutput();
});

test('shows help message', async () => {
  const result = await runCLI(['--help']);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('unifig - File merge CLI tool');
  expect(result.stdout).toContain('USAGE:');
  expect(result.stdout).toContain('COMMANDS:');
});

test('shows version', async () => {
  const result = await runCLI(['--version']);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('unifig v1.0.0');
});

test('basic file copying', async () => {
  const result = await runCLI([TEST_FIXTURES, TEST_OUTPUT, '--create-dirs']);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Merge complete');

  // Check that files were copied
  const outputFiles = await readdir(TEST_OUTPUT);
  expect(outputFiles).toContain('basic.txt');

  const content = await readFile(join(TEST_OUTPUT, 'basic.txt'), 'utf-8');
  expect(content).toBe('This is a basic file.');
});

test('template variable replacement', async () => {
  const result = await runCLI([TEST_FIXTURES, TEST_OUTPUT, '--create-dirs'], {
    PROJECT_NAME: 'TestProject',
    VERSION: '1.2.3',
    AUTHOR: 'TestAuthor',
  });

  expect(result.exitCode).toBe(0);

  // Check template file was processed
  const templateContent = await readFile(join(TEST_OUTPUT, 'template-file.txt'), 'utf-8');
  expect(templateContent).toContain('Project: TestProject');
  expect(templateContent).toContain('Version: 1.2.3');
  expect(templateContent).toContain('Author: TestAuthor');
});

test('environment variable injection', async () => {
  const result = await runCLI([TEST_FIXTURES, TEST_OUTPUT, '--create-dirs'], {
    DATABASE_URL: 'postgresql://localhost:5432/test',
    API_KEY: 'secret-key-123',
    DEBUG: 'true',
  });

  expect(result.exitCode).toBe(0);

  // Check env file was processed
  const envContent = await readFile(join(TEST_OUTPUT, 'env-file.env'), 'utf-8');
  expect(envContent).toContain('DATABASE_URL=postgresql://localhost:5432/test');
  expect(envContent).toContain('API_KEY=secret-key-123');
  expect(envContent).toContain('DEBUG=true');
});

test('pattern matching - include specific files', async () => {
  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--pattern', '*.txt',
    '--create-dirs'
  ]);

  expect(result.exitCode).toBe(0);

  const outputFiles = await readdir(TEST_OUTPUT);
  expect(outputFiles).toContain('basic.txt');
  expect(outputFiles).not.toContain('template-file.txt'); // This comes from .template file, not .txt
  expect(outputFiles).not.toContain('config.json');
  expect(outputFiles).not.toContain('javascript-file.js');
});

test('pattern matching - include subdirectory files', async () => {
  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--pattern', 'subdir/**/*',
    '--create-dirs'
  ]);

  expect(result.exitCode).toBe(0);

  const subdirFiles = await readdir(join(TEST_OUTPUT, 'subdir'));
  expect(subdirFiles).toContain('special-file.txt');
  expect(subdirFiles).toContain('typescript-file.ts');
});

test('pattern matching - exclude files', async () => {
  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--pattern', '**/*',
    '--pattern', '!*.json*',
    '--create-dirs'
  ]);

  expect(result.exitCode).toBe(0);

  const outputFiles = await readdir(TEST_OUTPUT);
  expect(outputFiles).toContain('basic.txt');
  expect(outputFiles).toContain('template-file.txt');
  expect(outputFiles).not.toContain('config.json');
});

test('dry run mode', async () => {
  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--dry-run',
    '--verbose'
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('[DRY RUN]');
  expect(result.stdout).toContain('Would write:');

  // Check that no files were actually created
  try {
    await readdir(TEST_OUTPUT);
    expect(true).toBe(false); // Should not reach here
  } catch {
    // Directory should not exist
  }
});

test('force overwrite', async () => {
  // Create a file first
  await mkdir(TEST_OUTPUT, { recursive: true });
  await Bun.write(join(TEST_OUTPUT, 'basic.txt'), 'original content');

  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--force'
  ]);

  expect(result.exitCode).toBe(0);

  const content = await readFile(join(TEST_OUTPUT, 'basic.txt'), 'utf-8');
  expect(content).toBe('This is a basic file.'); // Should be overwritten
});

test('create directories', async () => {
  const deepOutput = join(TEST_OUTPUT, 'deep', 'nested', 'path');

  const result = await runCLI([
    TEST_FIXTURES,
    deepOutput,
    '--create-dirs'
  ]);

  expect(result.exitCode).toBe(0);

  // Check that deep directory structure was created
  const dirStat = await fsStat(deepOutput);
  expect(dirStat.isDirectory()).toBe(true);

  const content = await readFile(join(deepOutput, 'basic.txt'), 'utf-8');
  expect(content).toBe('This is a basic file.');
});

test('verbose logging', async () => {
  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--verbose',
    '--create-dirs'
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('[DEBUG]');
  expect(result.stdout).toContain('Processed');
});

test('create plugin command', async () => {
  const pluginName = 'test-integration-plugin';

  const result = await runCLI(['create-plugin', pluginName]);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain(`Plugin ${pluginName} created successfully`);

  // Check that plugin directory was created
  const pluginDir = join(process.cwd(), pluginName);
  const pluginDirStat = await fsStat(pluginDir);
  expect(pluginDirStat.isDirectory()).toBe(true);

  // Clean up
  await rm(pluginDir, { recursive: true, force: true });
});

test('error handling - missing source', async () => {
  const result = await runCLI([]);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('Source path is required');
});

test('error handling - missing destination', async () => {
  const result = await runCLI([TEST_FIXTURES]);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('Destination path is required');
});

test('error handling - invalid arguments', async () => {
  const result = await runCLI(['--invalid-flag']);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('Unknown argument');
});

test('import path transformation', async () => {
  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--create-dirs'
  ], {
    oldPackageName: 'old-package',
    newPackageName: 'new-package',
  });

  expect(result.exitCode).toBe(0);

  // Check that JavaScript file was processed
  const jsContent = await readFile(join(TEST_OUTPUT, 'javascript-file.js'), 'utf-8');
  expect(jsContent).toContain("from 'new-package/utils'");
  expect(jsContent).not.toContain("from 'old-package/utils'");

  // Check TypeScript file
  const tsContent = await readFile(join(TEST_OUTPUT, 'subdir', 'typescript-file.ts'), 'utf-8');
  expect(tsContent).toContain("from 'new-package/helpers'");
  expect(tsContent).not.toContain("from 'old-package/helpers'");
});

test('JSON template processing', async () => {
  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--create-dirs',
    '--force'
  ], {
    PROJECT_NAME: 'JSONProject',
    VERSION: '2.0.0',
    DEBUG: 'false',
  });

  expect(result.exitCode).toBe(0);

  const jsonContent = await readFile(join(TEST_OUTPUT, 'config.json'), 'utf-8');
  const config = JSON.parse(jsonContent);
  expect(config.project).toBe('JSONProject');
  expect(config.settings.version).toBe('2.0.0');
  expect(config.settings.debug).toBe(false); // DEBUG="false" becomes false in JSON context
});

test('template variable defaults', async () => {
  const result = await runCLI([
    TEST_FIXTURES,
    TEST_OUTPUT,
    '--create-dirs'
  ], {
    PROJECT_NAME: 'CustomProject',
    // VERSION and AUTHOR not provided, should use defaults
  });

  expect(result.exitCode).toBe(0);

  // Check template file was processed with defaults
  const defaultContent = await readFile(join(TEST_OUTPUT, 'default-template.txt'), 'utf-8');
  expect(defaultContent).toContain('Project: CustomProject'); // Provided value
  expect(defaultContent).toContain('Version: 1.0.0'); // Default value
  expect(defaultContent).toContain('Author: Unknown'); // Default value
});