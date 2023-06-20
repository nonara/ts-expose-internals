import fs from 'fs';
import path from 'path';
import * as os from 'os';


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const tmpRoot = process.env.TMP_ROOT_PATH ?? path.join(os.tmpdir(), 'tsei');

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function getTmpDir(subDir: string): string {
  const tmpDir = path.resolve(tmpRoot, subDir);
  return tmpDir;
}

export function withTmpDir<T>(subDir: string, fn: (tmpDir: string) => T): T {
  const tmpDirPath = getTmpDir(subDir);

  /* Prepare dir */
  if (fs.existsSync(tmpDirPath)) fs.rmSync(tmpDirPath, { recursive: true, force: true });
  fs.mkdirSync(tmpDirPath, { recursive: true });

  /* Run function + cleanup */
  try {
    return fn(tmpDirPath);
  } finally {
    fs.rmSync(tmpDirPath, { recursive: true, force: true });
  }
}

// endregion
