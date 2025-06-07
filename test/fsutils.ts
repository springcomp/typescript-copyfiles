import fs from 'node:fs';

export async function mkdirp(p: string): Promise<string | undefined> {
  let status: fs.Stats | null = null;
  try {
    status = await fs.promises.stat(p);
  } catch {}
  return !status ? fs.promises.mkdir(p, { recursive: true }) : await Promise.resolve(undefined);
}

export async function rimraf(p: string): Promise<void> {
  let status: fs.Stats | null = null;
  try {
    status = await fs.promises.stat(p);
  } catch {}
  if (status && status.isDirectory()) {
    return fs.promises.rmdir(p, { recursive: true });
  } else if (status && status.isFile()) {
    return fs.promises.unlink(p);
  } else {
    return await Promise.resolve();
  }
}
