import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import { glob } from 'tinyglobby';
import { mkdirp, rimraf } from './fsutils.js';
import copyfiles, { CopyFilesOptions } from '../src/index.js';

// Async wrapper for copyfiles (callback-based to Promise-based)
function copyfilesAsync(args: string[], opts?: CopyFilesOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof opts === 'function' || opts === undefined) {
      copyfiles(args, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      copyfiles(args, opts, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }
  });
}

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
    await fs.promises.writeFile('input/a.txt', 'a');
    await fs.promises.writeFile('input/b.txt', 'b');
    await fs.promises.writeFile('input/c.js', 'c');
    await copyfilesAsync(['input/*.txt', 'output']);
    const files = await fs.promises.readdir('output/input');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('modes', async () => {
    await fs.promises.writeFile('input/a.txt', 'a', { mode: 0o100755 });
    await fs.promises.writeFile('input/b.txt', 'b');
    await fs.promises.writeFile('input/c.js', 'c');
    await copyfilesAsync(['input/*.txt', 'output']);
    const files = await fs.promises.readdir('output/input');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
    expect((await fs.promises.stat('output/input/a.txt')).mode & 0o777).toBe(0o755);
  });

  it('exclude', async () => {
    await fs.promises.writeFile('input/a.txt', 'a');
    await fs.promises.writeFile('input/b.txt', 'b');
    await fs.promises.writeFile('input/c.js.txt', 'c');
    await fs.promises.writeFile('input/d.ps.txt', 'd');
    const options: CopyFilesOptions = {
      exclude: ['**/*.js.txt', '**/*.ps.txt'],
    };
    await copyfilesAsync(['input/*.txt', 'output'], options);
    const files = await fs.promises.readdir('output/input');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('all', async () => {
    await fs.promises.writeFile('input/a.txt', 'a');
    await fs.promises.writeFile('input/b.txt', 'b');
    await fs.promises.writeFile('input/.c.txt', 'c');
    await copyfilesAsync(['input/*.txt', 'output'], { all: true });
    const files = await fs.promises.readdir('output/input');
    expect(files.sort()).toEqual(['.c.txt', 'a.txt', 'b.txt']);
  });

  it('error on nothing copied', async () => {
    await fs.promises.writeFile('input/.c.txt', 'c');
    let error: unknown = undefined;
    try {
      await copyfilesAsync(['input/*.txt', 'output'], { error: true });
    } catch (err) {
      error = err;
    }
    expect(error).toBeTruthy();
  });

  it('soft', async () => {
    await mkdirp('output/input/other');
    await fs.promises.writeFile('input/a.txt', 'inputA');
    await fs.promises.writeFile('output/input/a.txt', 'outputA');
    expect((await fs.promises.readFile('output/input/a.txt')).toString()).toBe('outputA');
    await fs.promises.writeFile('input/b.txt', 'b');
    await fs.promises.writeFile('input/other/c.txt', 'inputC');
    await fs.promises.writeFile('output/input/other/c.txt', 'outputC');
    await fs.promises.writeFile('input/other/d.txt', 'd');
    await copyfilesAsync(['input/**/*.txt', 'output'], { soft: true });
    const files = await fs.promises.readdir('output/input');
    expect(files.sort()).toEqual(['a.txt', 'b.txt', 'other']);
    expect((await fs.promises.readFile('output/input/a.txt')).toString()).toBe('outputA');
    expect((await fs.promises.readFile('output/input/b.txt')).toString()).toBe('b');
    expect((await fs.promises.readFile('output/input/other/c.txt')).toString()).toBe('outputC');
  });

  it('with up', async () => {
    await fs.promises.writeFile('input/a.txt', 'a');
    await fs.promises.writeFile('input/b.txt', 'b');
    await fs.promises.writeFile('input/c.js', 'c');
    await copyfilesAsync(['input/*.txt', 'output'], { up: 1 });
    const files = await fs.promises.readdir('output');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('with up 2', async () => {
    await fs.promises.writeFile('input/other/a.txt', 'a');
    await fs.promises.writeFile('input/other/b.txt', 'b');
    await fs.promises.writeFile('input/other/c.js', 'c');
    await copyfilesAsync(['input/**/*.txt', 'output'], { up: 2 });
    const files = await fs.promises.readdir('output');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('flatten', async () => {
    await fs.promises.writeFile('input/other/a.txt', 'a');
    await fs.promises.writeFile('input/b.txt', 'b');
    await fs.promises.writeFile('input/other/c.js', 'c');
    await copyfilesAsync(['input/**/*.txt', 'output'], { flat: true, up: true });
    const files = await fs.promises.readdir('output');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('follow', async () => {
    await fs.promises.mkdir('input/origin', { recursive: true });
    await fs.promises.mkdir('input/origin/inner', { recursive: true });
    await fs.promises.writeFile('input/origin/inner/a.txt', 'a');
    try {
      await fs.promises.symlink('origin', 'input/dest');
    } catch {}
    await copyfilesAsync(['input/**/*.txt', 'output'], { up: 1, follow: true });
    const files = await glob('output/**/*.txt');
    expect(files.map(f => f.replace(/\\/g, '/')).sort()).toEqual([
      'output/dest/inner/a.txt',
      'output/origin/inner/a.txt',
    ]);
  });
});
