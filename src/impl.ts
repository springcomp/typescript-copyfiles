import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable, ReadableOptions, Transform, TransformCallback } from 'stream';
import { Callback, CopyFilesOptions } from './index.js';
import { glob, GlobOptions } from 'tinyglobby';

type GlobOptionsWithPatternsUnset = Omit<GlobOptions, 'patterns'>;
type CopyStatus = { copied: boolean };
type Logger = (text: string) => void;
type PathStat = {
  pathName: string;
  pathStat: fs.Stats;
  outName: string;
};

export class CopyFilesStreamHandler {
  public copyFiles(paths: string[], callback: Callback, options?: CopyFilesOptions): void {
    const self = this;
    const array = paths.map(function (pathName: string) {
      return self.getUntildified(pathName);
    });
    const outDir = array.pop();
    if (outDir === undefined) {
      throw 'paths must contain at least two elements';
    }

    const soft = options?.soft ?? false;
    const up = options?.up ?? 0;
    const verbose = options?.verbose ?? false;

    const globOpts: GlobOptionsWithPatternsUnset = {};
    if (options?.exclude) {
      globOpts.ignore = options.exclude;
    }
    if (options?.all) {
      globOpts.dot = true;
    }
    if (options?.follow) {
      globOpts.followSymbolicLinks = true;
    }

    const logger = this.makeConsoleLogger(verbose);

    const status = { copied: false };

    const stream = new ToStream(array);
    const unglob = new UnglobTransform(globOpts, logger);
    const stat = new StatTransform(outDir, soft, up, logger);
    const copy = new CopyTransform(status, logger);

    stream
      .on('data', chunk => {
        const pathName = chunk.toString();
        logger(`received: ${pathName}`);
      })
      .pipe(unglob)
      .on('error', callback)
      .pipe(stat)
      .on('error', callback)
      .pipe(copy)
      .on('error', callback)
      .on('finish', () => {
        if (options?.error && !status.copied) {
          return callback(new Error('nothing copied'));
        }
        callback();
      });
  }
  private makeConsoleLogger(verbose: boolean): Logger {
    return verbose ? console.log : _ => {};
  }
  private getUntildified(pathName: string) {
    if (!pathName.startsWith('~')) {
      return pathName;
    }
    const homeDirectory = os.homedir();
    return homeDirectory ? pathName.replace(/^~(?=$|\/|\\)/, homeDirectory) : pathName;
  }
}
class ToStream extends Readable {
  private index = 0;
  private array: string[] = [];
  constructor(array: string[], options?: ReadableOptions) {
    super(options);
    this.array = array;
  }
  _read(_: number) {
    if (this.index >= this.array.length) {
      this.push(null);
    } else {
      this.push(this.array[this.index++]);
    }
  }
}
class UnglobTransform extends Transform {
  private logger: Logger;
  private globOpts: GlobOptionsWithPatternsUnset;
  constructor(globOpts: GlobOptionsWithPatternsUnset, logger: Logger) {
    super();
    this.logger = logger;
    this.globOpts = globOpts;
  }
  _transform(chunk: Buffer, _: BufferEncoding, next: TransformCallback) {
    const self = this;
    const pathName: string = chunk.toString();
    glob(pathName, this.globOpts)
      .then(paths => {
        paths.forEach(function (unglobbedPath) {
          self.logger(`unglobbed path: ${unglobbedPath}`);
          self.push(unglobbedPath);
        });
        next();
      })
      .catch(err => {
        if (err) {
          return next(err);
        }
      });
  }
}
class StatTransform extends Transform {
  private logger: Logger;
  private outDir: string;
  private soft: boolean;
  private up: boolean | number;
  constructor(outDir: string, soft: boolean, up: boolean | number, logger: Logger) {
    super({ objectMode: true });
    this.logger = logger;
    this.outDir = outDir;
    this.soft = soft;
    this.up = up;
  }
  _transform(chunk: Buffer, _: BufferEncoding, next: TransformCallback) {
    const self = this;
    const pathName: string = chunk.toString();
    fs.stat(pathName, (err, pathStat) => {
      if (err) {
        return next(err);
      }
      const outName = path.join(this.outDir, self.dealWith(pathName, self.up));
      function done() {
        mkdirp(path.dirname(outName)).then(() => {
          next(null, {
            pathName: pathName,
            pathStat: pathStat,
            outName: outName,
          });
        }, next);
      }
      if (pathStat.isDirectory()) {
        this.logger(`skipping, is directory: ${pathName}`);
        return next();
      }
      if (!pathStat.isFile()) {
        return next(new Error('how can it be neither file nor folder?'));
      }
      if (!this.soft) {
        return done();
      }
      fs.stat(outName, function (err) {
        if (!err) {
          //file exists
          return next();
        }
        if (err.code === 'ENOENT') {
          //file does not exist
          return done();
        }
        // other error
        return next(err);
      });
    });
  }
  private depth(pathName: string): number {
    return path.normalize(pathName).split(path.sep).length - 1;
  }
  private dealWith(pathName: string, up: boolean | number): string {
    if (!up) {
      return pathName;
    }
    if (up === true) {
      return path.basename(pathName);
    }
    if (this.depth(pathName) < up) {
      throw new Error('cant go up that far');
    }
    return path.join.apply(path, path.normalize(pathName).split(path.sep).slice(up));
  }
}
class CopyTransform extends Transform {
  private logger: Logger;
  private status: CopyStatus;
  constructor(status: CopyStatus, logger: Logger) {
    super({ objectMode: true });
    this.logger = logger;
    this.status = status;
  }
  _transform(chunk: PathStat, _: BufferEncoding, next: TransformCallback) {
    if (!this.status.copied) {
      this.status.copied = true;
    }
    const pathName: string = chunk.pathName;
    const pathStat: fs.Stats = chunk.pathStat;
    const outName: string = chunk.outName;
    this.logger(`copy from: ${pathName}`);
    this.logger(`copy to: ${outName}`);
    this.copyFileStream(pathName, outName, pathStat, next);
  }
  private copyFileStream(src: string, dst: string, stat: fs.Stats, callback: Callback): void {
    fs.createReadStream(src)
      .pipe(fs.createWriteStream(dst, { mode: stat.mode }))
      .once('error', callback)
      .once('finish', () => {
        fs.chmod(dst, stat.mode, err => {
          callback(err);
        });
      });
  }
}

async function mkdirp(p: string): Promise<string | undefined> {
  let status: fs.Stats | null = null;
  try {
    status = await fs.promises.stat(p);
  } catch {}
  return !status ? fs.promises.mkdir(p, { recursive: true }) : await Promise.resolve(undefined);
}
