import { BuildDetail, getStorage, Storage } from './storage';


/* ****************************************************************************************************************** */
// region: Types
/* ****************************************************************************************************************** */

export interface TseiContext {
  dryRun?: boolean;
  currentBuild?: {
    buildDetail: BuildDetail;
    dtsContent: string;
  }
  repoRootDir: string;
  storage: Storage;
}

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function createContext(repoRootDir: string = process.cwd()): TseiContext {
  const storage = getStorage(repoRootDir);
  const context: TseiContext = {
    repoRootDir,
    storage,
  };

  return context;
}

// endregion
