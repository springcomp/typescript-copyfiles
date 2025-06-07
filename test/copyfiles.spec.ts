import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import { glob } from 'tinyglobby';
import { mkdirp, rimraf } from './fsutils.js';
import cp, { CopyFilesOptions } from '../src/index.js';

const { copyfiles } = cp.promises;
const { writeFile, readFile, readdir, stat, mkdir, symlink } = fs.promises;

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
    await writeFile('input/a.txt', 'a');
    await writeFile('input/b.txt', 'b');
    await writeFile('input/c.js', 'c');
    await copyfiles(['input/*.txt', 'output']);
    const files = await readdir('output/input');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('modes', async () => {
    await writeFile('input/a.txt', 'a', { mode: 0o100755 });
    await writeFile('input/b.txt', 'b');
    await writeFile('input/c.js', 'c');
    await copyfiles(['input/*.txt', 'output']);
    const files = await readdir('output/input');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
    expect((await stat('output/input/a.txt')).mode & 0o777).toBe(0o755);
  });

  it('exclude', async () => {
    await writeFile('input/a.txt', 'a');
    await writeFile('input/b.txt', 'b');
    await writeFile('input/c.js.txt', 'c');
    await writeFile('input/d.ps.txt', 'd');
    const options: CopyFilesOptions = {
      exclude: ['**/*.js.txt', '**/*.ps.txt'],
    };
    await copyfiles(['input/*.txt', 'output'], options);
    const files = await readdir('output/input');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('all', async () => {
    await writeFile('input/a.txt', 'a');
    await writeFile('input/b.txt', 'b');
    await writeFile('input/.c.txt', 'c');
    await copyfiles(['input/*.txt', 'output'], { all: true });
    const files = await readdir('output/input');
    expect(files.sort()).toEqual(['.c.txt', 'a.txt', 'b.txt']);
  });

  it('error on nothing copied', async () => {
    await writeFile('input/.c.txt', 'c');
    let error: unknown = undefined;
    try {
      await copyfiles(['input/*.txt', 'output'], { error: true });
    } catch (err) {
      error = err;
    }
    expect(error).toBeTruthy();
  });

  it('soft', async () => {
    await mkdirp('output/input/other');
    await writeFile('input/a.txt', 'inputA');
    await writeFile('output/input/a.txt', 'outputA');
    expect((await readFile('output/input/a.txt')).toString()).toBe('outputA');
    await writeFile('input/b.txt', 'b');
    await writeFile('input/other/c.txt', 'inputC');
    await writeFile('output/input/other/c.txt', 'outputC');
    await writeFile('input/other/d.txt', 'd');
    await copyfiles(['input/**/*.txt', 'output'], { soft: true });
    const files = await readdir('output/input');
    expect(files.sort()).toEqual(['a.txt', 'b.txt', 'other']);
    expect((await readFile('output/input/a.txt')).toString()).toBe('outputA');
    expect((await readFile('output/input/b.txt')).toString()).toBe('b');
    expect((await readFile('output/input/other/c.txt')).toString()).toBe('outputC');
  });

  it('with up', async () => {
    await writeFile('input/a.txt', 'a');
    await writeFile('input/b.txt', 'b');
    await writeFile('input/c.js', 'c');
    await copyfiles(['input/*.txt', 'output'], { up: 1 });
    const files = await readdir('output');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('with up 2', async () => {
    await writeFile('input/other/a.txt', 'a');
    await writeFile('input/other/b.txt', 'b');
    await writeFile('input/other/c.js', 'c');
    await copyfiles(['input/**/*.txt', 'output'], { up: 2 });
    const files = await readdir('output');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('flatten', async () => {
    await writeFile('input/other/a.txt', 'a');
    await writeFile('input/b.txt', 'b');
    await writeFile('input/other/c.js', 'c');
    await copyfiles(['input/**/*.txt', 'output'], { flat: true, up: true });
    const files = await readdir('output');
    expect(files.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('follow', async () => {
    await mkdir('input/origin', { recursive: true });
    await mkdir('input/origin/inner', { recursive: true });
    await writeFile('input/origin/inner/a.txt', 'a');
    try {
      await symlink('origin', 'input/dest');
    } catch {}
    await copyfiles(['input/**/*.txt', 'output'], { up: 1, follow: true });
    const files = await glob('output/**/*.txt');
    expect(files.map(f => f.replace(/\\/g, '/')).sort()).toEqual([
      'output/dest/inner/a.txt',
      'output/origin/inner/a.txt',
    ]);
  });
});
