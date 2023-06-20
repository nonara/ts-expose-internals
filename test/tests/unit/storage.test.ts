import * as storageModule from '../../../src/storage';
import { getStorage, Storage, updateStorage } from '../../../src/storage';
import childProcessModule, { execSync } from 'child_process';
import fsModule from 'fs';
import path from 'path';


/* ****************************************************************************************************************** */
// region: Tests
/* ****************************************************************************************************************** */

describe('storage.ts', () => {
  let execSyncSpy: jest.SpyInstance;
  let writeFileSyncSpy: jest.SpyInstance;
  let existsSyncSpy: jest.SpyInstance;
  let readFileSyncSpy: jest.SpyInstance;
  beforeAll(() => {
    execSyncSpy = jest.spyOn(childProcessModule, 'execSync').mockImplementation();
    existsSyncSpy = jest.spyOn(fsModule, 'existsSync').mockImplementation();
    writeFileSyncSpy = jest.spyOn(fsModule, 'writeFileSync').mockImplementation();
    readFileSyncSpy = jest.spyOn(fsModule, 'readFileSync').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateStorage()', () => {
    const storage: Storage = {
      settings: <never>{},
      buildDetails: [],
      save: jest.fn()
    };
    const repoRootDir = '/test/repo/root/dir';
    const filePath = path.join(repoRootDir, 'tsei-storage.json');

    test('Updates the storage file and creates a new git commit', () => {
      execSyncSpy
        .mockReturnValueOnce(Buffer.from('oldCommitId')) // getLatestCommitId
        .mockReturnValueOnce(Buffer.from('')) // git add
        .mockReturnValueOnce(Buffer.from('')) // git commit
        .mockReturnValueOnce(Buffer.from('newCommitId')) // getLatestCommitId

      const commitId = updateStorage(storage, repoRootDir);

      expect(writeFileSyncSpy).toHaveBeenCalledWith(filePath, JSON.stringify(storage, null, 2), 'utf8');
      expect(execSyncSpy).toHaveBeenCalledWith(`git add ${filePath}`, expect.any(Object));
      expect(execSyncSpy).toHaveBeenCalledWith('git commit -m "chore(storage): Updated storage"', expect.any(Object));

      expect(commitId).toEqual('newCommitId');
    });

    test('Throws an error if the commit creation failed', () => {
      execSyncSpy.mockReturnValue(Buffer.from('sameCommitId'));

      expect(() => updateStorage(storage, repoRootDir)).toThrow('Failed to create commit for updateStorage!');
    });

    test('Does not create a new git commit if skipCommit is true', () => {
      expect(execSyncSpy).not.toHaveBeenCalled();

      const commitId = updateStorage(storage, repoRootDir, true);

      expect(writeFileSyncSpy).toHaveBeenCalledWith(filePath, JSON.stringify(storage, null, 2), 'utf8');

      expect(commitId).toEqual('');
    });
  });

  describe('getStorage()', () => {
    const repoRootDir = '/test/repo/root/dir';
    const filePath = path.join(repoRootDir, 'tsei-storage.json');
    const fileContent = JSON.stringify({
      settings: {},
      buildDetails: [],
    });

    test('Returns the parsed storage file and a save function', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(fileContent);

      const storage = getStorage(repoRootDir);

      expect(existsSyncSpy).toHaveBeenCalledWith(filePath);
      expect(readFileSyncSpy).toHaveBeenCalledWith(filePath, 'utf8');

      expect(storage).toEqual(expect.objectContaining(JSON.parse(fileContent)));
      expect(storage.save).toEqual(expect.any(Function));
    });

    test('Throws an error if the storage file does not exist', () => {
      existsSyncSpy.mockReturnValue(false);

      expect(() => getStorage(repoRootDir)).toThrow('Storage file not found!');
    });

    test('Save function of storage object calls updateStorage correctly', () => {
      execSyncSpy.mockReturnValueOnce(Buffer.from('oldCommitId'));
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(fileContent);

      // Mock the actual updateStorage function
      const updateStorageSpy = jest.spyOn(storageModule, 'updateStorage');
      updateStorageSpy.mockImplementation(() => 'newCommitId');

      const storage = getStorage(repoRootDir);

      // Call save function and verify if updateStorage was called correctly
      const commitId = storage.save(true);

      expect(updateStorageSpy).toHaveBeenCalledWith(storage, repoRootDir, true);
      expect(commitId).toBe('newCommitId');
    });
  });
});

// endregion
