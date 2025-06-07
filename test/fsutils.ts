import fs from 'node:fs';

export async function mkdirp(p: string): Promise<string | undefined> {
  let status: fs.Stats | null = null;
  try {
    status = await fs.promises.stat(p);
  } catch {}
  return !status ? fs.promises.mkdir(p, { recursive: true }) : await Promise.resolve(undefined);
}
