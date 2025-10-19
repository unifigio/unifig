import { writeFile, mkdir, access } from 'fs/promises';
import { dirname, join, isAbsolute } from 'path';
import { createInterface } from 'readline';
import { Logger } from '../utils/logger';
import type { TransformResult, unifigOptions } from '../types';

export class FileWriter {
  private logger: Logger;

  constructor(private options: unifigOptions) {
    this.logger = new Logger(options.verbose);
  }

  async writeFile(result: TransformResult): Promise<void> {
    if (result.content === null) {
      // Skip this file
      return;
    }

    const destinationPath = this.resolveDestinationPath(result.destination);

    // Check if file exists
    const exists = await this.fileExists(destinationPath);

    if (exists && !this.options.force) {
      if (this.options.interactive) {
        const shouldOverwrite = await this.promptOverwrite(destinationPath);
        if (!shouldOverwrite) {
          this.logger.debug(`Skipped existing file: ${destinationPath}`);
          return;
        }
      } else if (!this.options.dryRun) {
        // Skip existing files unless force is enabled
        this.logger.debug(`Skipped existing file: ${destinationPath}`);
        return;
      }
    }

    if (this.options.dryRun) {
      this.logger.info(`[DRY RUN] Would write: ${destinationPath}`);
      return;
    }

    // Create directories if needed
    if (this.options.createDirs) {
      await this.ensureDirectory(dirname(destinationPath));
    }

    // Write the file
    await writeFile(destinationPath, result.content, {
      mode: result.mode,
      encoding: result.encoding,
    });

    this.logger.debug(`Wrote file: ${destinationPath}`);

    // Handle additional files
    if (result.additionalFiles) {
      for (const additional of result.additionalFiles) {
        const additionalPath = this.resolveDestinationPath(additional.destination);
        await writeFile(additionalPath, additional.content);
        this.logger.debug(`Wrote additional file: ${additionalPath}`);
      }
    }
  }

  private resolveDestinationPath(destination: string): string {
    const dest = this.options.destination;
    const absoluteDest = isAbsolute(dest) ? dest : join(process.cwd(), dest);

    if (isAbsolute(destination)) {
      return destination;
    }

    return join(absoluteDest, destination);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async promptOverwrite(filePath: string): Promise<boolean> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`File ${filePath} already exists. Overwrite? (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}