import fs from 'node:fs';
const { mkdir, rmdir, stat, unlink } = fs.promises;

export async function mkdirp(p: string): Promise<string | undefined> {
  let status: fs.Stats | null = null;
  try {
    status = await stat(p);
  } catch {}
  return !status ? mkdir(p, { recursive: true }) : await Promise.resolve(undefined);
}

export async function rimraf(p: string): Promise<void> {
  let status: fs.Stats | null = null;
  try {
    status = await stat(p);
  } catch {}
  if (status && status.isDirectory()) {
    await rmdir(p, { recursive: true });
  } else if (status && status.isFile()) {
    await unlink(p);
  } else {
    return await Promise.resolve();
  }
}
