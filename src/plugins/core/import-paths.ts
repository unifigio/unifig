import type { Plugin, TransformContext, TransformResult } from '../../types';

export const importPathsPlugin: Plugin = {
  name: 'import-paths',
  version: '1.0.0',
  match: ['**/*.{js,ts,jsx,tsx}'],

  async transform(content: string | Buffer, context: TransformContext): Promise<TransformResult> {
    const { oldPackageName, newPackageName } = context.variables;

    if (!oldPackageName || !newPackageName) {
      return {
        destination: context.destinationPath,
        content,
      };
    }

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
  },
};