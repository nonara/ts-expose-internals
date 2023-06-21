import { run } from '../../../src/main';
import * as tsTagsModule from '../../../src/ts-tags';
import * as tsDeclarationsModule from '../../../src/ts-declarations';
import * as publishModule from '../../../src/publish';
import * as tmpDirModule from '../../../src/utils/tmp-dir';
import childProcess from 'child_process';
import fs from 'fs';


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const storageFileData = {
  settings: { tsVersion: '1.0.0', skipTags: [], maxAttempts: 5, tsRepoUrl: 'repoUrl' },
  buildDetails: [
    { tsVersion: '1.1.0', tag: 'v1.1.0', attempts: 2, complete: false, lastAttempt: Date.now() },
    { tsVersion: '2.0.0', tag: 'v2.0.0', attempts: 3, complete: false, lastAttempt: Date.now() },
    { tsVersion: '2.1.0', tag: 'v2.1.0', attempts: 5, complete: false, lastAttempt: Date.now() },
  ]
};

// endregion


/* ****************************************************************************************************************** */
// region: Tests
/* ****************************************************************************************************************** */

describe('main.ts', () => {
  describe('run() - with versions', () => {
    let getApplicableTsTagsSpy: jest.SpyInstance;
    let buildTsDeclarationsSpy: jest.SpyInstance;
    let execSyncSpy: jest.SpyInstance;
    let fsExistsSyncSpy: jest.SpyInstance;
    let fsReadFileSyncSpy: jest.SpyInstance;
    let fsWriteFileSyncSpy: jest.SpyInstance;
    let publishSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    beforeAll(() => {
      fsExistsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      fsWriteFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => { });
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      execSyncSpy = jest.spyOn(childProcess, 'execSync')
        .mockImplementation(() => Buffer.from(Math.random().toString(36).substring(2, 15)));

      publishSpy = jest.spyOn(publishModule, 'publish')
        .mockImplementationOnce(() => { })
        .mockImplementationOnce(() => { throw new Error('Publish failed'); })
        .mockImplementation(() => { });

      getApplicableTsTagsSpy = jest.spyOn(tsTagsModule, 'getApplicableTsTags')
        .mockReturnValue([ 'v1.1.0', 'v2.0.0', 'v3.0.0' ]);

      buildTsDeclarationsSpy = jest.spyOn(tsDeclarationsModule, 'buildTsDeclarations')
        .mockImplementation((_, tag) => ({ dtsContent: 'dtsContent', tsVersion: tag.replace(/^v/g, '') }));

      const originalReadFileSync = fs.readFileSync;
      fsReadFileSyncSpy = jest.spyOn(fs, 'readFileSync')
        .mockImplementation(function (this: any, p) {
          if (typeof p === "string" && p.endsWith('tsei-storage.json')) return JSON.stringify(storageFileData);
          return originalReadFileSync.apply(this, <any>arguments);
        });

      try {
        run(false);
      } catch (e) {
        expect(e.message).toContain('Finished with errors');
      }
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    test('Writes correct data to storage file', () => {
      expect(fsReadFileSyncSpy).toBeCalled();
      expect(fsWriteFileSyncSpy).toBeCalled();

      const writeArgs = fsWriteFileSyncSpy.mock.calls[0][1];
      const storage = JSON.parse(writeArgs);

      expect(storage.settings).toEqual(storageFileData.settings);

      expect(storage.buildDetails).toHaveLength(4);

      expect(storage.buildDetails[0]).toEqual({
        tsVersion: '1.1.0',
        tag: 'v1.1.0',
        attempts: 3,
        complete: true,
        lastAttempt: expect.any(Number)
      });

      expect(storage.buildDetails[1]).toEqual({
        tsVersion: '2.0.0',
        tag: 'v2.0.0',
        attempts: 4,
        complete: false,
        lastAttempt: expect.any(Number)
      });

      expect(storage.buildDetails[2]).toEqual({
        tsVersion: '2.1.0',
        tag: 'v2.1.0',
        attempts: 5,
        complete: false,
        lastAttempt: expect.any(Number)
      });

      expect(storage.buildDetails[3]).toEqual({
        tsVersion: '3.0.0',
        tag: 'v3.0.0',
        attempts: 1,
        complete: true,
        lastAttempt: expect.any(Number)
      });
    });

    test(`Skips build beyond maxAttempts`, () => {
      const writeArgs = fsWriteFileSyncSpy.mock.calls[0][1];
      const storage = JSON.parse(writeArgs);

      const buildDetail = storage.buildDetails.find((bd: any) => bd.tsVersion === '2.1.0');
      expect(buildDetail.attempts).toEqual(5);
      expect(buildDetail.complete).toEqual(false);
    });

    test(`Commits and pushes changes`, () => {
      expect(execSyncSpy).toHaveBeenNthCalledWith(2, expect.stringMatching(/^git add .+?tsei-storage.json$/g), expect.any(Object));
      expect(execSyncSpy).toHaveBeenNthCalledWith(3, 'git commit -m "chore(storage): Updated storage"', expect.any(Object));
      expect(execSyncSpy).toHaveBeenNthCalledWith(5, 'git push', expect.any(Object));
    });

    test('Builds declarations and publishes them', () => {
      expect(buildTsDeclarationsSpy).toBeCalledTimes(3);
      expect(buildTsDeclarationsSpy).toHaveBeenNthCalledWith(1, 'repoUrl', 'v1.1.0', expect.any(String), true);
      expect(buildTsDeclarationsSpy).toHaveBeenNthCalledWith(2, 'repoUrl', 'v2.0.0', expect.any(String), true);
      expect(buildTsDeclarationsSpy).toHaveBeenNthCalledWith(3, 'repoUrl', 'v3.0.0', expect.any(String), true);

      expect(publishSpy).toBeCalledTimes(3);
      expect(publishSpy.mock.calls[0][0]).toEqual(expect.objectContaining({
        dryRun: false,
        currentBuild: {
          buildDetail: expect.objectContaining({
            tsVersion: '1.1.0',
            tag: 'v1.1.0',
          }),
          dtsContent: 'dtsContent',
        },
        repoRootDir: expect.any(String),
        storage: expect.objectContaining({
          settings: storageFileData.settings,
          buildDetails: expect.any(Array),
        })
      }));

      expect(publishSpy.mock.calls[1][0]).toEqual(expect.objectContaining({
        dryRun: false,
        currentBuild: {
          buildDetail: expect.objectContaining({
            tsVersion: '2.0.0',
            tag: 'v2.0.0',
          }),
          dtsContent: 'dtsContent',
        },
        repoRootDir: expect.any(String),
        storage: expect.objectContaining({
          settings: storageFileData.settings,
          buildDetails: expect.any(Array),
        })
      }));
      expect(publishSpy.mock.calls[2][0]).toEqual(expect.objectContaining({
        dryRun: false,
        currentBuild: {
          buildDetail: expect.objectContaining({
            tsVersion: '3.0.0',
            tag: 'v3.0.0',
          }),
          dtsContent: 'dtsContent',
        },
        repoRootDir: expect.any(String),
        storage: expect.objectContaining({
          settings: storageFileData.settings,
          buildDetails: expect.any(Array),
        })
      }));
    });

    test('Gracefully handles build failure', () => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toMatch('Publish failed');

      const writeArgs = fsWriteFileSyncSpy.mock.calls[0][1];
      const storage = JSON.parse(writeArgs);

      // Find the 'v2.0.0' version build details
      const v2BuildDetails = storage.buildDetails.find((bd: any) => bd.tag === 'v2.0.0');

      expect(v2BuildDetails).toBeDefined();
      expect(v2BuildDetails.complete).toBe(false);
    });
  });

  describe('run() - no versions to process', () => {
    let getApplicableTsTagsSpy: jest.SpyInstance;
    let execSyncSpy: jest.SpyInstance;
    let withTmpDirSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let result: any;

    beforeAll(() => {
      execSyncSpy = jest.spyOn(childProcess, 'execSync').mockReturnValue('');
      getApplicableTsTagsSpy = jest.spyOn(tsTagsModule, 'getApplicableTsTags').mockReturnValue([]);
      withTmpDirSpy = jest.spyOn(tmpDirModule, 'withTmpDir').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // noinspection JSVoidFunctionReturnValueUsed
      result = run(true);
      expect(getApplicableTsTagsSpy).toHaveBeenCalled();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    test('Logs info message', () => {
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls[0][0]).toMatch('No new versions to build!');
    });

    test('Does not process any logic', () => {
      expect(execSyncSpy).not.toHaveBeenCalled();
      expect(withTmpDirSpy).not.toHaveBeenCalled();
    });

    test('Exits gracefully', () => {
      expect(result).toBeUndefined();
    });
  });
});

// endregion
