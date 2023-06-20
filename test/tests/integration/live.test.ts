/**
 * NOTE: To debug this, uncomment the Debug entries in Config
 */
import { spawn, spawnSync, SpawnSyncReturns } from 'child_process';
import { Storage } from '../../../src/storage';
import path from 'path';
import fs from 'fs';
import { copyRecursive, createLink } from '../../src/file-utils';
import { getTmpRootPath, integrationTestCopyFiles, repoRootPath } from '../../src/config';


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

let wipeTmp: boolean | undefined;

/* ********************************************************* *
 * Debug
 * ********************************************************* */

// process.env.TMP_ROOT_PATH = './tmp';
// wipeTmp = false;
// process.env.LIVE_TEST = 'true';

/* ********************************************************* *
 * Config
 * ********************************************************* */

jest.setTimeout(900_000); // 15 minutes

process.env.NODE_ENV = 'debug'; // We require this to be on to get the debug info from npm publish

const tseiStorage: Storage.Raw = {
  'settings': {
    'tsVersion': '>=1.0.0',
    'maxAttempts': 5,
    'tsRepoUrl': 'https://github.com/microsoft/TypeScript.git',
    'skipTags': []
  },
  buildDetails: []
};

const copyFiles = [
  ...integrationTestCopyFiles,
  'test/assets/int-live/integration-hook.js',
];

// endregion


/* ****************************************************************************************************************** */
// region: Tests
/* ****************************************************************************************************************** */

describe('Live Test', () => {
  if (!process.env.LIVE_TEST)
    test(`Skipping live test (LIVE_TEST=false)`, () => {});
  else
    (process.env.LIVE_TEST ? describe : describe.skip)('Running live test (LIVE_TEST=true)', () => {
      // Skip is not env LIVE_TEST
      if (!process.env.LIVE_TEST) return;

      let tmpDir: string;
      let spawnOut: string = '';
      let spawnErr: string = '';
      let spawnHadError: boolean;
      beforeAll(() => {
        /* Create Environment */
        tmpDir = path.resolve(process.cwd(), getTmpRootPath(), 'tsei-test-int-live');
        if (fs.existsSync(tmpDir)) {
          try { fs.unlinkSync(path.join(tmpDir, 'node_modules')); }
          catch { }
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

        /* Create Storage */
        const storagePath = path.join(tmpDir, 'tsei-storage.json');
        fs.writeFileSync(storagePath, JSON.stringify(tseiStorage, null, 2));

        /* Run */
        return new Promise<void>((resolve, reject) => {
          const child = spawn('node', [
            '-r', 'ts-node/register',
            '-r', './integration-hook.js',
            'src/main.ts',
            '--dry-run'
          ], {
            cwd: tmpDir,
            env: {
              ...process.env,
              TMP_ROOT_PATH: tmpDir,
            }
          });

          child.stdout.on('data', (data) => {
            const dataStr = data.toString();
            spawnOut += dataStr;
            process.stdout.write(dataStr);
          });

          child.stderr.on('data', (data) => {
            const dataStr = data.toString();
            spawnErr += dataStr;
            process.stderr.write(dataStr);
          });

          child.on('error', (error) => {
            spawnHadError = true;
            console.error(`Error: ${error.message}`);
            reject(error);
          });

          child.on('exit', (code) => {
            if (code !== 0) {
              spawnHadError = true;
              console.error(`Command exited with status ${code}`);
              reject(new Error(`Command exited with status ${code}`));
            } else {
              console.log(`Exit code: ${code}`);
              resolve();
            }
          });
        });
      });

      afterAll(() => {
        if (wipeTmp) fs.rmSync(tmpDir, { maxRetries: 3, recursive: true, force: true });
      });

      test(`Ran without error`, () => {
        expect(spawnHadError).toBeFalsy();
      });

      test(`Packaged all files`, () => {
        const res = spawnErr;

        /* Map NPM Response */
        const contentsStartPos = res.indexOf('Tarball Contents');
        expect(contentsStartPos).toBeGreaterThan(-1);

        const tarballStartPos = res.indexOf('Tarball Details', contentsStartPos);
        expect(tarballStartPos).toBeGreaterThan(0);

        const tarballEndPos = res.indexOf('total files:', tarballStartPos);
        expect(tarballEndPos).toBeGreaterThan(0);

        const contents = res.substring(contentsStartPos, tarballStartPos);
        const details = res.substring(tarballStartPos, tarballEndPos);

        /* Check Packed Files */
        expect(contents).toEqual(expect.stringMatching(/\sREADME\.md\s/));
        expect(contents).toEqual(expect.stringMatching(/\sindex\.d\.ts\s/));
        expect(contents).toEqual(expect.stringMatching(/\spackage\.json\s/));
        expect(contents).toEqual(expect.stringMatching(/\stypescript\.d\.ts\s/));

        /* Check Published Version */
        const ver = /^\[v(\S+?)] Publishing/gm.exec(spawnOut)?.[1] ?? '';
        expect(ver).toBeTruthy();
        const escapedVer = ver.replace(/\./g, '\\.');

        expect(details).toEqual(expect.stringMatching(new RegExp(`\\sversion:\\s+${escapedVer}\\s`)));
      });
    });
});

// endregion
