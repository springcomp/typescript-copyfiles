import { CopyFilesStreamHandler } from './impl.js';

export interface CopyFilesOptions {
  /** include files & directories beginning with a dot (.) */
  all?: boolean;
  /** throw error if nothing is copied */
  error?: boolean;
  /** pattern or glob to exclude */
  exclude?: string | string[];
  /** flatten the output */
  flat?: boolean;
  /**
   * follow symbolink links
   * @default false
   */
  follow?: boolean;
  /** do not overwrite destination files if they exist */
  soft?: boolean;
  /**
   * slice a path off the bottom of the paths
   * @default 0
   */
  up?: number | true;
  /** print more information to console */
  verbose?: boolean;
}

export type Callback = (err?: NodeJS.ErrnoException | null, data?: unknown) => void;

export function copyFiles(args: string[], config: CopyFilesOptions | Callback, callback?: Callback) {
  if (typeof config === 'function') {
    callback = config;
    config = {
      up: 0,
    };
  }
  if (typeof config !== 'object' && config) {
    config = {
      up: config,
    };
  }
  if (typeof callback !== 'function') {
    throw new Error('callback is not optional');
  }
  const handler = new CopyFilesStreamHandler();
  handler.copyFiles(args, callback, config);
}

// Async wrapper for copyFiles (callback-based to Promise-based)
function copyfilesAsync(args: string[], opts?: CopyFilesOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof opts === 'function' || opts === undefined) {
      copyFiles(args, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      copyFiles(args, opts, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }
  });
}

// Attach to the main export for promises-style usage
export interface CopyFilesWithPromises {
  (...args: Parameters<typeof copyFiles>): ReturnType<typeof copyFiles>;
  promises: {
    copyfiles: typeof copyfilesAsync;
  };
}

const copyfilesExport = copyFiles as CopyFilesWithPromises;
copyfilesExport.promises = {
  copyfiles: copyfilesAsync,
};

export default copyfilesExport;
