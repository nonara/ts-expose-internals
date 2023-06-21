import path from 'path';
import os from 'os';


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

export const integrationTestCopyFiles = [
  'src',
  'package-files',
  'package.json',
  'tsconfig.base.json',
  'tsconfig.json',
  'README.md'
];

export const repoRootPath = path.join(__dirname, '..', '..');
export const assetsPath = path.join(__dirname, '..', 'assets');

export const getTmpRootPath = () => process.env.TMP_ROOT_PATH ?? os.tmpdir();

// endregion
