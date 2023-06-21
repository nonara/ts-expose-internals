import fs from 'fs';
import { TseiContext } from './context';
import { withTmpDir } from './utils/tmp-dir';
import path from 'path';
import { execSync } from 'child_process';
import semver from 'semver/preload';
import { execCmd } from './utils/exec';


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

function replaceJsonInFile<T>(filePath: string, replacer: (json: T) => T) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  replacer(data);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getPreRelease(version: string) {
  const parsedVersion = semver.parse(version)!;
  const prereleaseFull = parsedVersion.prerelease.join('.');
  const prereleaseWithoutNumber = prereleaseFull.replace(/\d+$/, '');

  return { prereleaseFull, prereleaseWithoutNumber };
}

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function publish(context: TseiContext) {
  const { dtsContent, buildDetail } = context.currentBuild!;
  const { storage } = context;
  const versionTag = buildDetail.tag;

  withTmpDir('publish', destDir => {
    console.log(`[${versionTag}] Copying npm package files...`);

    /* Copy files */
    const srcDir = path.join(context.repoRootDir, 'package-files');
    fs.readdirSync(srcDir).forEach(f => fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f)));

    /* Write d.ts file */
    console.log(`[${versionTag}] Writing declarations & package...`);
    fs.writeFileSync(path.join(destDir, 'typescript.d.ts'), dtsContent);

    /* Fixup package.json */
    replaceJsonInFile(path.join(destDir, 'package.json'), (pkgJson: any) => {
      pkgJson.version = buildDetail.tsVersion;
      delete pkgJson.private;
    });

    /* Publish */
    const { prereleaseWithoutNumber } = getPreRelease(buildDetail.tsVersion);
    let npmTag = prereleaseWithoutNumber;

    if (!prereleaseWithoutNumber) {
      const highestCompletedTag = storage
        .buildDetails
        .filter(b => b.complete && b.tsVersion)
        .sort((a, b) => semver.rcompare(a.tsVersion, b.tsVersion))[0];

      if (!highestCompletedTag || semver.gt(buildDetail.tsVersion, highestCompletedTag.tsVersion)) npmTag = 'latest';
    }

    console.log(`[${versionTag}] Publishing (tag: ${npmTag})...`);
    execCmd(
      `npm publish --ignore-scripts ${npmTag ? `--tag "${npmTag}"` : ''}${context.dryRun ? ' --dry-run' : ''}`,
      {
        cwd: destDir,
        env: {
          ...process.env,
        }
      }
    );
  });
}

// endregion
