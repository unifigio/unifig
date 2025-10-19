import type { Plugin, TransformContext, TransformResult } from '../../types';

export const templateVariablesPlugin: Plugin = {
  name: 'template-variables',
  version: '1.0.0',
  match: '**/*.template.*',

  async transform(content: string | Buffer, context: TransformContext): Promise<TransformResult> {
    let processed = content.toString();

    // Replace {{VARIABLE}} patterns
    processed = processed.replace(
      /\{\{(\w+)\}\}/g,
      (match, key) => {
        // Check context variables first
        if (context.variables[key]) {
          return String(context.variables[key]);
        }

        // Check environment variables
        if (process.env[key]) {
          return process.env[key]!;
        }

        // Return original if not found
        return match;
      }
    );

    // Remove .template from filename
    const destination = context.destinationPath.replace('.template', '');

    return {
      destination,
      content: processed,
    };
  },
};