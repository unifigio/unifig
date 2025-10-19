import { readdir, stat, readFile } from 'fs/promises';
import { join, relative, isAbsolute } from 'path';
import type { FileInfo, unifigOptions } from '../types';

export class SourceReader {
  constructor(private options: unifigOptions) {}

  async *readFiles(): AsyncGenerator<FileInfo> {
    const source = this.options.source;

    if (this.isGitUrl(source)) {
      yield* this.readFromGit(source);
    } else {
      yield* this.readFromDirectory(source);
    }
  }

  private isGitUrl(source: string): boolean {
    return source.startsWith('https://') ||
           source.startsWith('git@') ||
           source.endsWith('.git');
  }

  private async *readFromGit(url: string): AsyncGenerator<FileInfo> {
    // For now, we'll use a simple approach - clone to temp directory
    // In a real implementation, we'd use git2 or similar
    const tempDir = `/tmp/unifig-${Date.now()}`;

    try {
      // Clone the repository
      const { execSync } = await import('child_process');
      execSync(`git clone --depth 1 ${url} ${tempDir}`, { stdio: 'inherit' });

      yield* this.readFromDirectory(tempDir);
    } finally {
      // Clean up temp directory
      try {
        const { execSync } = await import('child_process');
        execSync(`rm -rf ${tempDir}`);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async *readFromDirectory(dirPath: string): AsyncGenerator<FileInfo> {
    const absoluteDir = isAbsolute(dirPath) ? dirPath : join(process.cwd(), dirPath);

    async function* walkDirectory(currentPath: string): AsyncGenerator<FileInfo> {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(absoluteDir, fullPath);

        // Skip common unwanted directories
        if (entry.isDirectory()) {
          if (['.git', 'node_modules', '.DS_Store'].includes(entry.name)) {
            continue;
          }
          yield* walkDirectory(fullPath);
        } else if (entry.isFile()) {
          const stats = await stat(fullPath);
          const fileInfo: FileInfo = {
            path: relativePath,
            stats: {
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime,
              isDirectory: false,
              isSymlink: stats.isSymbolicLink(),
            },
          };

          // Only read content for small files to avoid memory issues
          if (stats.size < 1024 * 1024) { // 1MB limit
            try {
              fileInfo.content = await readFile(fullPath);
            } catch {
              // Skip files we can't read
              continue;
            }
          }

          yield fileInfo;
        }
      }
    }

    yield* walkDirectory(absoluteDir);
  }
}