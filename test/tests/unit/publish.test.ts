import fs from 'fs';
import childProcess, { execSync } from 'child_process';
import { TseiContext } from '../../../src/context';
import { publish } from '../../../src/publish';
import { BuildDetail } from '../../../src/storage';
import path from 'path';
import * as tmpDirModule from '../../../src/utils/tmp-dir';


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const buildDetail = {
  tag: 'v1.2.3',
  tsVersion: '1.2.3',
} as BuildDetail;

const dtsContent = 'content';

const context = {
  currentBuild: {
    dtsContent,
    buildDetail
  },
  repoRootDir: '/root/dir',
  storage: {
    buildDetails: [] as BuildDetail[]
  }
} as TseiContext;

const destDir = '/tmp/publish';

// endregion


/* ****************************************************************************************************************** */
// region: Tests
/* ****************************************************************************************************************** */

describe(`publish.ts`, () => {
  describe.each([ { dryRun: true }, { dryRun: false } ])(`publish() %s`, ({ dryRun }) => {
    let readDirSyncSpy: jest.SpyInstance;
    let copyFileSyncSpy: jest.SpyInstance;
    let readFileSyncSpy: jest.SpyInstance;
    let writeFileSyncSpy: jest.SpyInstance;
    let execSyncSpy: jest.SpyInstance;
    let withTmpDirSpy: jest.SpyInstance;

    beforeAll(() => {
      readDirSyncSpy = jest.spyOn(fs, 'readdirSync').mockReturnValue([ 'file1', 'file2' ] as any);
      readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        if ((p as string).endsWith('package.json')) return JSON.stringify({ version: '0.0.0', private: true });
        return '';
      });
      writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
      execSyncSpy = jest.spyOn(childProcess, 'execSync').mockImplementation();
      copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync').mockImplementation();
      withTmpDirSpy = jest.spyOn(tmpDirModule, 'withTmpDir').mockImplementation((p, fn) => fn('/tmp/' + p));

      publish({ ...context, dryRun });
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    test(`Copies package files`, () => {
      expect(readDirSyncSpy).toHaveBeenCalledWith(path.normalize('/root/dir/package-files'));
      expect(copyFileSyncSpy).toHaveBeenCalledTimes(2);
      expect(copyFileSyncSpy).toHaveBeenNthCalledWith(1, path.normalize('/root/dir/package-files/file1'), path.normalize('/tmp/publish/file1'));
      expect(copyFileSyncSpy).toHaveBeenNthCalledWith(2, path.normalize('/root/dir/package-files/file2'), path.normalize('/tmp/publish/file2'));
    });

    test('Writes DTS file', () => {
      expect(writeFileSyncSpy).toHaveBeenCalledWith(path.normalize('/tmp/publish/typescript.d.ts'), dtsContent);
    });

    test(`Publishes package ${dryRun ? '(with dry run)' : ''}`, () => {
      expect(execSyncSpy).toHaveBeenCalledWith(
        `npm publish --ignore-scripts --tag "latest"${dryRun ? ' --dry-run' : ''}`,
        expect.objectContaining({
          cwd: destDir,
        })
      );
    });

    test('Writes updated package.json file', () => {
      const writeCall = writeFileSyncSpy.mock.calls.find((c) => c[0].endsWith('package.json'));
      const writtenPkgJson = JSON.parse(writeCall![1]);
      expect(writtenPkgJson).toMatchObject({ version: buildDetail.tsVersion });
      expect(writtenPkgJson).not.toHaveProperty('private');
    });
  });
});

// endregion
