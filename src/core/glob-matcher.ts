import { minimatch } from 'minimatch';
import type { FileInfo, unifigOptions } from '../types';

export class GlobMatcher {
  constructor(private options: unifigOptions) {}

  shouldInclude(file: FileInfo): boolean {
    const patterns = this.options.patterns;

    // If no patterns specified, include all files
    if (!patterns || patterns.length === 0) {
      return true;
    }

    // Check if file matches any of the patterns
    return patterns.some(pattern => {
      // Handle negation patterns
      if (pattern.startsWith('!')) {
        return !minimatch(file.path, pattern.slice(1));
      }

      return minimatch(file.path, pattern);
    });
  }

  // Static method for simple pattern matching
  static matches(filePath: string, pattern: string | string[]): boolean {
    if (Array.isArray(pattern)) {
      return pattern.some(p => {
        if (p.startsWith('!')) {
          return !minimatch(filePath, p.slice(1));
        }
        return minimatch(filePath, p);
      });
    }

    if (pattern.startsWith('!')) {
      return !minimatch(filePath, pattern.slice(1));
    }

    return minimatch(filePath, pattern);
  }
}