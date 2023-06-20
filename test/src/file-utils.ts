import fs from 'fs';
import path from 'path';


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function copyRecursive(filePath: string, destPath: string) {
  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
    fs.readdirSync(filePath).forEach((item) => {
      copyRecursive(path.join(filePath, item), path.join(destPath, item));
    });
  } else {
    fs.copyFileSync(filePath, destPath);
  }
}

/** Create a link or junction to a file or directory. */
export function createLink(srcPath: string, destPath: string) {
  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);

  const stats = fs.statSync(srcPath);
  if (stats.isDirectory()) {
    fs.symlinkSync(srcPath, destPath, 'junction');
  } else {
    fs.linkSync(srcPath, destPath);
  }
}

export function rmDir(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (!fs.lstatSync(curPath).isSymbolicLink()) {
        if (fs.lstatSync(curPath).isDirectory()) {
          fs.rmSync(curPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(curPath);
        }
      }
    });
    fs.rmdirSync(dirPath);
  }
}

// endregion
