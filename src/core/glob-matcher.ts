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

    let hasPositiveMatch = false;
    let hasNegativeMatch = false;

    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        // Negative pattern
        if (minimatch(file.path, pattern.slice(1))) {
          hasNegativeMatch = true;
        }
      } else {
        // Positive pattern
        if (minimatch(file.path, pattern)) {
          hasPositiveMatch = true;
        }
      }
    }

    // Include if there's a positive match and no negative match
    return hasPositiveMatch && !hasNegativeMatch;
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