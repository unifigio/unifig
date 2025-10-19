import type { Plugin, TransformContext, TransformResult } from '../../types';

export const envInjectorPlugin: Plugin = {
  name: 'env-injector',
  version: '1.0.0',
  match: ['**/*.env.example', '**/*.env.template'],

  async transform(content: string | Buffer, context: TransformContext): Promise<TransformResult> {
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
  },
};