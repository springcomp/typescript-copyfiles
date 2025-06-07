import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import { glob } from 'tinyglobby';
import { mkdirp, rimraf } from './fsutils.js';
import copyfiles, { CopyFilesOptions } from '../src/index.js';

async function cleanDirs() {
  await rimraf('output');
  await rimraf('input');
}

async function setupDirs() {
  await mkdirp('input/other');
}

describe('copyfiles', () => {
  beforeEach(async () => {
    await cleanDirs();
    await setupDirs();
  });

  afterEach(async () => {
    await cleanDirs();
  });

  it('normal', async () => {
    fs.writeFileSync('input/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/c.js', 'c');
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/*.txt', 'output'], err => {
        if (err) {
          reject(err);
          return;
        }
        fs.readdir('output/input', (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          expect(files.sort()).toEqual(['a.txt', 'b.txt']);
          resolve();
        });
      });
    });
  });

  it('modes', async () => {
    fs.writeFileSync('input/a.txt', 'a', { mode: 0o100755 });
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/c.js', 'c');
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/*.txt', 'output'], err => {
        if (err) {
          reject(err);
          return;
        }
        fs.readdir('output/input', (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          expect(files.sort()).toEqual(['a.txt', 'b.txt']);
          expect(fs.statSync('output/input/a.txt').mode & 0o777).toBe(0o755);
          resolve();
        });
      });
    });
  });

  it('exclude', async () => {
    fs.writeFileSync('input/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/c.js.txt', 'c');
    fs.writeFileSync('input/d.ps.txt', 'd');
    const options: CopyFilesOptions = {
      exclude: ['**/*.js.txt', '**/*.ps.txt'],
    };
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/*.txt', 'output'], options, err => {
        if (err) {
          reject(err);
          return;
        }
        fs.readdir('output/input', (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          expect(files.sort()).toEqual(['a.txt', 'b.txt']);
          resolve();
        });
      });
    });
  });

  it('all', async () => {
    fs.writeFileSync('input/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/.c.txt', 'c');
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/*.txt', 'output'], { all: true }, err => {
        if (err) {
          reject(err);
          return;
        }
        fs.readdir('output/input', (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          expect(files.sort()).toEqual(['.c.txt', 'a.txt', 'b.txt']);
          resolve();
        });
      });
    });
  });

  it('error on nothing copied', async () => {
    fs.writeFileSync('input/.c.txt', 'c');
    await new Promise<void>((resolve) => {
      copyfiles(['input/*.txt', 'output'], { error: true }, err => {
        if (err) {
          expect(err).toBeTruthy();
          resolve();
          return;
        }
        resolve();
      });
    });
  });

  it('soft', async () => {
    await mkdirp('output/input/other');
    fs.writeFileSync('input/a.txt', 'inputA');
    fs.writeFileSync('output/input/a.txt', 'outputA');
    expect(fs.readFileSync('output/input/a.txt').toString()).toBe('outputA');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/other/c.txt', 'inputC');
    fs.writeFileSync('output/input/other/c.txt', 'outputC');
    fs.writeFileSync('input/other/d.txt', 'd');
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/**/*.txt', 'output'], { soft: true }, err => {
        if (err) {
          reject(err);
          return;
        }
        fs.readdir('output/input', (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          expect(files.sort()).toEqual(['a.txt', 'b.txt', 'other']);
          expect(fs.readFileSync('output/input/a.txt').toString()).toBe('outputA');
          expect(fs.readFileSync('output/input/b.txt').toString()).toBe('b');
          expect(fs.readFileSync('output/input/other/c.txt').toString()).toBe('outputC');
          resolve();
        });
      });
    });
  });

  it('with up', async () => {
    fs.writeFileSync('input/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/c.js', 'c');
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/*.txt', 'output'], { up: 1 }, err => {
        if (err) {
          reject(err);
          return;
        }
        fs.readdir('output', (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          expect(files.sort()).toEqual(['a.txt', 'b.txt']);
          resolve();
        });
      });
    });
  });

  it('with up 2', async () => {
    fs.writeFileSync('input/other/a.txt', 'a');
    fs.writeFileSync('input/other/b.txt', 'b');
    fs.writeFileSync('input/other/c.js', 'c');
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/**/*.txt', 'output'], { up: 2 }, err => {
        if (err) {
          reject(err);
          return;
        }
        fs.readdir('output', (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          expect(files.sort()).toEqual(['a.txt', 'b.txt']);
          resolve();
        });
      });
    });
  });

  it('flatten', async () => {
    fs.writeFileSync('input/other/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/other/c.js', 'c');
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/**/*.txt', 'output'], { flat: true, up: true }, err => {
        if (err) {
          reject(err);
          return;
        }
        fs.readdir('output', (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          expect(files.sort()).toEqual(['a.txt', 'b.txt']);
          resolve();
        });
      });
    });
  });

  it('follow', async () => {
    fs.mkdirSync('input/origin', { recursive: true });
    fs.mkdirSync('input/origin/inner', { recursive: true });
    fs.writeFileSync('input/origin/inner/a.txt', 'a');
    if (!fs.existsSync('input/dest')) {
      fs.symlinkSync('origin', 'input/dest');
    }
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/**/*.txt', 'output'], { up: 1, follow: true }, err => {
        if (err) {
          reject(err);
          return;
        }
        glob('output/**/*.txt').then(files => {
          expect(files.map(f => f.replace(/\\/g, '/')).sort()).toEqual([
            'output/dest/inner/a.txt',
            'output/origin/inner/a.txt',
          ]);
          resolve();
        }, reject);
      });
    });
  });
});
