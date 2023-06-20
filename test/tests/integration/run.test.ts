/**
 * NOTE: To debug this, uncomment the Debug entries in Config
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import semver from 'semver/preload';
import { fixupVersionTag } from '../../../src/ts-tags';
import { copyRecursive, createLink } from '../../src/file-utils';
import { assetsPath, getTmpRootPath, integrationTestCopyFiles, repoRootPath } from '../../src/config';


/* ****************************************************************************************************************** */
// region: Locals
/* ****************************************************************************************************************** */

let wipeTmp: boolean | undefined;

// endregion


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

/* ********************************************************* *
 * Debug
 * ********************************************************* */

process.env.TMP_ROOT_PATH = './tmp';
wipeTmp = false;
process.env.NODE_ENV = 'debug';    // Print extra debug info

/* ********************************************************* *
 * Config
 * ********************************************************* */

jest.setTimeout(300_000); // 5 minutes

const tags = [
  'v1.0.0', // Skips
  'v1.1.0',
  'v1.1.1', // Skips
  'v2.0.0',
  'v2.1.0', // Skips
  'v3.0-rc'
]

const skippedTags = [
  'v1.0.0',
  'v1.1.1',
  'v2.1.0',
];

const copyFiles = [
  ...integrationTestCopyFiles,
  'test/assets/int-run/tsei-storage.json',
  'test/assets/int-run/integration-hook.js',
  'test/assets/int-run/dummy-typescript.internal.d.ts'
]

// endregion


/* ****************************************************************************************************************** */
// region: Tests
/* ****************************************************************************************************************** */

describe(`End-to-end Run`, () => {
  let dryRun = false;
  const processableTags = tags.filter((tag) => !skippedTags.includes(tag));

  let tmpDir: string;
  beforeAll(() => {
    tmpDir = path.resolve(process.cwd(), getTmpRootPath(), 'tsei-test-int-run');
    if (fs.existsSync(tmpDir)) {
      try { fs.unlinkSync(path.join(tmpDir, 'node_modules')); } catch { }
      fs.rmSync(tmpDir, { maxRetries: 3, recursive: true, force: true });
    }
    if (fs.existsSync(tmpDir)) throw new Error(`Failed to remove tmp dir: ${tmpDir}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    copyFiles.forEach((p) => {
      const srcPath = path.join(repoRootPath, p);
      const srcFileName = path.basename(p);
      copyRecursive(srcPath, path.join(tmpDir, srcFileName))
    });

    createLink(path.join(repoRootPath, 'node_modules'), path.join(tmpDir, 'node_modules'));

    execSync(`node -r ts-node/register -r ./integration-hook.js src/main.ts ${dryRun ? '--dry-run' : ''}`, {
      cwd: tmpDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        TS_VERSIONS: tags.join(','),
        TMP_ROOT_PATH: tmpDir,
      }
    });
  });

  afterAll(() => {
    if (wipeTmp) fs.rmSync(tmpDir, { maxRetries: 3, recursive: true, force: true });
  });

  test(`Skips tags that should be skipped`, () => {
    skippedTags.forEach((tag) => {
      expect(fs.existsSync(path.join(tmpDir, 'node_modules', 'typescript', tag))).toBe(false);
    });
  });

  test(`Outputs all package files for each processable tag`, () => {
    processableTags.forEach(tag => {
      const fixedTag = fixupVersionTag(tag);
      const ver = fixedTag.slice(1);
      const baseDir = path.join(tmpDir, 'dist', ver);
      expect(fs.existsSync(baseDir)).toBe(true);
      expect(fs.existsSync(path.join(baseDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(baseDir, 'typescript.d.ts'))).toBe(true);
      expect(fs.existsSync(path.join(baseDir, '.npmrc'))).toBe(true);
      expect(fs.existsSync(path.join(baseDir, 'index.d.ts'))).toBe(true);
      expect(fs.existsSync(path.join(baseDir, 'README.md'))).toBe(true);
    });
  });

  test(`TS declarations file is correct`, () => {
    const expectedTsDec = fs.readFileSync(path.join(assetsPath, 'int-run/expected-typescript.d.ts'), 'utf8');
    processableTags.forEach(tag => {
      const fixedTag = fixupVersionTag(tag);
      const ver = fixedTag.slice(1);
      const decFileContent = fs.readFileSync(path.join(tmpDir, 'dist', ver, 'typescript.d.ts'), 'utf8');
      expect(decFileContent).toBe(expectedTsDec);
    });
  });

  test(`package.json is correct`, () => {
    const basePkgJson = JSON.parse(fs.readFileSync(path.join(repoRootPath, 'package-files/package.json'), 'utf8'));
    processableTags.forEach(tag => {
      const fixedTag = fixupVersionTag(tag);
      const ver = fixedTag.slice(1);
      const expectedPkgJson = {
        ...basePkgJson,
        version: ver
      };
      delete expectedPkgJson.private;

      const pkgJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'dist', ver, 'package.json'), 'utf8'));
      expect(pkgJson).toEqual(expectedPkgJson);
      expect(pkgJson.private).toBe(undefined);
    });
  });

  describe(`Commands Run`, () => {
    let logContent: string;
    beforeAll(() => {
      logContent = fs.readFileSync(path.join(tmpDir, 'log.txt'), 'utf8');
    });

    test(`Create commit`, () => {
      expect(logContent).toContain('git commit -m "chore(storage): Updated storage"');
    });

    test(`Publish packages`, () => {
      for (const tag of processableTags) {
        const fixedTag = fixupVersionTag(tag);
        let prerelease = semver.prerelease(fixedTag);
        let expectedTag: string = "latest";
        if (prerelease) expectedTag = prerelease.join(".").replace(/\d+$/, '')

        const startPos = logContent.indexOf(`git clone --depth 1 --branch ${tag}`);
        const endPos = logContent.indexOf(`git checkout`, startPos + 1);
        const log = logContent.slice(startPos, endPos);

        expect(log).toContain(`git clone --depth 1 --branch ${tag}`);
        expect(log).toContain(`npm publish --ignore-scripts --tag "${expectedTag}"`);
      }
    })
  });

  test(`Properly updates tsei-storage.json`, () => {
    const tseiStorage = JSON.parse(fs.readFileSync(path.join(tmpDir, 'tsei-storage.json'), 'utf8'));
    const expectedTseiStorage = JSON.parse(fs.readFileSync(path.join(assetsPath, 'int-run/expected-tsei-storage.json'), 'utf8'));

    tseiStorage.buildDetails.forEach((buildInfo: any) => {
      buildInfo.lastAttempt = 0;
    });

    expect(tseiStorage).toEqual(expectedTseiStorage);
  });
});

// endregion
