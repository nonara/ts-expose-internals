import childProcessModule from 'child_process';
import * as tsTagsModule from '../../../src/ts-tags';
import * as tmpDirModule from '../../../src/utils/tmp-dir';
import { getAllTsTags, getApplicableTsTags } from '../../../src/ts-tags';
import { createContext } from '../../../src/context';


/* ****************************************************************************************************************** */
// region: Tests
/* ****************************************************************************************************************** */

describe('ts-tags.ts', () => {
  let execSyncSpy: jest.SpyInstance;
  let withTmpDirSpy: jest.SpyInstance;
  beforeAll(() => {
    execSyncSpy = jest.spyOn(childProcessModule, 'execSync').mockImplementation();
    withTmpDirSpy = jest.spyOn(tmpDirModule, 'withTmpDir').mockImplementation((subDir, fn) => fn('/test/dir'));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    execSyncSpy.mockClear();
    withTmpDirSpy.mockClear();
  });

  describe('getAllTsTags()', () => {
    test('Gets all TypeScript tags and returns them', () => {
      const context = createContext();
      context.storage.settings.tsRepoUrl = 'https://github.com/microsoft/TypeScript.git';

      execSyncSpy.mockImplementation((cmd) => {
        if (cmd.startsWith('git ls-remote --tags')) return Buffer.from(
          '0 refs/tags/v1.0.0\n0 refs/tags/v2.3.1-beta\n0 refs/tags/v2.3.1\nrefs/tags/invalid-tag\n0 refs/tags/3.0.0'
        );
        return '';
      })

      const tags = getAllTsTags(context);

      expect(withTmpDirSpy).toHaveBeenCalledWith('tags', expect.any(Function));
      expect(execSyncSpy.mock.calls).toEqual([
        [ 'git init', expect.objectContaining({ cwd: '/test/dir' }) ],
        [ 'git remote add origin https://github.com/microsoft/TypeScript.git', expect.objectContaining({ cwd: '/test/dir' }) ],
        [ 'git ls-remote --tags https://github.com/microsoft/TypeScript.git', expect.objectContaining({ cwd: '/test/dir' }) ],
      ]);

      expect(tags).toEqual([ 'v1.0.0', 'v2.3.1-beta', 'v2.3.1', 'invalid-tag', '3.0.0' ]);
    });
  });

  describe('getApplicableTsTags()', () => {
    let getAllTsTagsSpy: jest.SpyInstance;
    let tags: string[];
    beforeAll(() => {
      getAllTsTagsSpy = jest.spyOn(tsTagsModule, 'getAllTsTags').mockImplementation();
      getAllTsTagsSpy.mockImplementation(() => [
        'v1.0.0',
        'v2.3.1',
        'v1.1.0',
        'v1.1.2',
        'v1.1.3',
        'v3.0.0',
        'v2.3-beta',
        'v2.3.1-rc',
        'invalid-tag'
      ]);

      const context = createContext();
      context.storage.settings.tsVersion = '>=1.1.0';
      context.storage.settings.skipTags = [ 'v1.1.2' ];
      context.storage.buildDetails.push({
        tsVersion: '1.1.3',
        tag: 'v1.1.3',
        attempts: 1,
        complete: true,
        lastAttempt: Date.now()
      });

      tags = getApplicableTsTags(context);
    });

    test(`Calls getAllTsTags()`, () => {
      expect(getAllTsTagsSpy).toHaveBeenCalledWith(expect.anything());
    });

    test(`Filters out tags that don't match tsVersion`, () => {
      expect(tags).not.toContain('v1.0.0');
    });

    test(`Filters out tags that are in skipTags`, () => {
      expect(tags).not.toContain('v1.1.2');
    });

    test(`Filters out tags that are already built`, () => {
      expect(tags).not.toContain('v1.1.3');
    });

    test(`Filters out tags that are not valid semver`, () => {
      expect(tags).not.toContain('invalid-tag');
    });

    test(`Tags are in proper order`, () => {
      expect(tags).toEqual([ 'v3.0.0', 'v2.3.1', 'v2.3.1-rc', 'v2.3-beta', 'v1.1.0' ]);
    });
  });
});

// endregion
