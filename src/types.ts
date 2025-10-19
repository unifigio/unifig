export interface unifigOptions {
  source: string;
  destination: string;
  patterns?: string[];
  plugins?: string[];
  dryRun?: boolean;
  force?: boolean;
  createDirs?: boolean;
  interactive?: boolean;
  parallel?: number;
  verbose?: boolean;
}

export interface GlobPattern {
  pattern: string;
  transformer?: string;
  priority?: number;
}

export interface TransformContext {
  sourcePath: string;
  destinationPath: string;
  fileStats: FileStats;
  options: unifigOptions;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TransformResult {
  destination: string;
  content: string | Buffer | null;
  mode?: number;
  encoding?: BufferEncoding;
  metadata?: Record<string, any>;
  additionalFiles?: Array<{
    destination: string;
    content: string | Buffer;
  }>;
}

export interface FileStats {
  size: number;
  modified: Date;
  created: Date;
  isDirectory: boolean;
  isSymlink: boolean;
}

export interface Plugin {
  name: string;
  version: string;
  match: string | string[] | RegExp | ((path: string) => boolean);
  transform: (content: string | Buffer, context: TransformContext) => Promise<TransformResult> | TransformResult;
  priority?: number;
  requires?: string[];
  capabilities?: {
    streaming?: boolean;
    concurrent?: boolean;
    incremental?: boolean;
  };
  resources?: {
    maxMemory?: number;
    timeout?: number;
  };
}

export interface FileInfo {
  path: string;
  stats: FileStats;
  content?: string | Buffer;
}