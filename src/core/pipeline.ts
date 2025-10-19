import { SourceReader } from './source-reader';
import { GlobMatcher } from './glob-matcher';
import { FileWriter } from './file-writer';
import { Logger } from '../utils/logger';
import { templateVariablesPlugin } from '../plugins/core/template-variables';
import { importPathsPlugin } from '../plugins/core/import-paths';
import { envInjectorPlugin } from '../plugins/core/env-injector';
import type { unifigOptions, FileInfo, TransformContext, TransformResult, Plugin } from '../types';

export async function runMerge(options: unifigOptions): Promise<void> {
  const sourceReader = new SourceReader(options);
  const globMatcher = new GlobMatcher(options);
  const fileWriter = new FileWriter(options);

  // Load core plugins
  const plugins: Plugin[] = [
    templateVariablesPlugin,
    importPathsPlugin,
    envInjectorPlugin,
  ];

  // Collect variables from environment
  const variables: Record<string, any> = { ...process.env };

  const logger = new Logger(options.verbose);

  if (options.dryRun) {
    logger.info(`[DRY RUN] Starting merge from ${options.source} to ${options.destination}`);
  } else {
    logger.info(`Starting merge from ${options.source} to ${options.destination}`);
  }

  let processedCount = 0;
  let skippedCount = 0;

  for await (const file of sourceReader.readFiles()) {
    // Check if file should be included based on patterns
    if (!globMatcher.shouldInclude(file)) {
      if (options.verbose) {
        console.log(`Skipping ${file.path} (pattern mismatch)`);
      }
      skippedCount++;
      continue;
    }

    // Apply transformations
    const result = await applyTransformations(file, plugins, options, variables);

    if (result) {
      await fileWriter.writeFile(result);
      processedCount++;
      logger.debug(`Processed ${file.path} -> ${result.destination}`);
    } else {
      skippedCount++;
      logger.debug(`Skipped ${file.path} (transformation returned null)`);
    }
  }

  logger.info(`Merge complete. Processed: ${processedCount}, Skipped: ${skippedCount}`);
}

async function applyTransformations(
  file: FileInfo,
  plugins: any[],
  options: unifigOptions,
  variables: Record<string, any>
): Promise<TransformResult | null> {
  let currentContent: string | Buffer | null = file.content || null;
  let currentDestination = file.path;
  let metadata: Record<string, any> = {};

  // If no content was read (large file), skip transformations
  if (!currentContent) {
    return {
      destination: currentDestination,
      content: null, // Skip the file
    };
  }

  for (const plugin of plugins) {
    const matches = GlobMatcher.matches(file.path, plugin.match);
    if (options.verbose) {
      console.log(`[DEBUG] Checking plugin ${plugin.name} for ${file.path}: ${matches}`);
    }
    if (!matches) {
      continue;
    }

    const context: TransformContext = {
      sourcePath: file.path,
      destinationPath: currentDestination,
      fileStats: file.stats,
      options,
      variables,
      metadata,
    };

    try {
      const transformResult: TransformResult = await plugin.transform(currentContent, context);

      if (transformResult.content === null) {
        // Plugin chose to skip this file
        return null;
      }

      currentContent = transformResult.content;
      currentDestination = transformResult.destination;
      metadata = { ...metadata, ...transformResult.metadata };
    } catch (error) {
      console.error(`Error in plugin ${plugin.name}: ${error}`);
      // Continue with other plugins
    }
  }

  return {
    destination: currentDestination,
    content: currentContent,
    metadata,
  };
}