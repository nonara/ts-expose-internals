import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { execCmd } from './utils/exec';


/* ****************************************************************************************************************** */
// region: Types
/* ****************************************************************************************************************** */

export interface BuildDetail {
  tsVersion: string;
  tag: string;
  attempts: number;
  complete: boolean;
  lastAttempt: number; /* ctime */
}

export interface Settings {
  tsVersion: string;
  skipTags: string[];
  maxAttempts: number;
  tsRepoUrl: string;
}

export interface Storage {
  settings: Settings;
  buildDetails: BuildDetail[];

  save(skipCommit?: boolean): string;
}

export namespace Storage {
  export type Raw = Omit<Storage, 'save'>;
}

// endregion


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

function getLatestCommitId(execSyncOptions: any): string {
  return execCmd('git rev-parse HEAD', { ...execSyncOptions }).toString().trim();
}

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function updateStorage(storage: Storage, repoRootDir: string, skipCommit?: boolean): string {
  /* Update the storage file */
  const filePath = path.join(repoRootDir, 'tsei-storage.json');
  fs.writeFileSync(filePath, JSON.stringify(storage, null, 2), 'utf8');

  if (!skipCommit) {
    const execSyncOptions = { cwd: repoRootDir, env: { ...process.env } };

    /* Get current commit ID */
    const prevCommitId = getLatestCommitId(execSyncOptions);

    /* Create a git commit with the updated file */
    execCmd(`git add ${filePath}`, { ...execSyncOptions });
    execCmd('git commit -m "chore(storage): Updated storage"', { ...execSyncOptions });

    /* Verify new commit */
    const newCommitId = getLatestCommitId(repoRootDir);
    if (prevCommitId === newCommitId) throw new Error('Failed to create commit for updateStorage!');

    return newCommitId;
  } else {
    return '';
  }
}

export function getStorage(repoRootDir: string): Storage {
  const filePath = path.join(repoRootDir, 'tsei-storage.json');

  if (!fs.existsSync(filePath)) throw new Error('Storage file not found!');

  /* Read storage file */
  const data = fs.readFileSync(filePath, 'utf8');
  const parsedData = JSON.parse(data);

  const storage: Storage = {
    settings: parsedData.settings,
    buildDetails: parsedData.buildDetails,

    save: function(skipCommit?: boolean) {
      return module.exports.updateStorage(this, repoRootDir, skipCommit);
    }
  };

  return storage;
}

// endregion
