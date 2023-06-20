import childProcess from 'child_process';
import fs from 'fs';
import * as tsDeclarationsModule from '../../../src/ts-declarations';
import { buildTsDeclarations, fixupTsDeclarations } from '../../../src/ts-declarations';


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const mockInternalDeclarations = 'declare namespace ts { const b: ts.A; }\n declare namespace ts { type A = number; } \nexport = ts;\n';
const expectedOutputDeclarations = 'declare module "typescript" { const b: A; } declare module "typescript" { type A = number; }\n';

// endregion


/* ****************************************************************************************************************** */
// region: Tests
/* ****************************************************************************************************************** */

describe('ts-declarations.ts', () => {
  describe('buildTsDeclarations()', () => {
    let result: { dtsContent: string, tsVersion: string };
    let fixupTsDeclarationsSpy: jest.SpyInstance;
    let execSyncSpy: jest.SpyInstance;
    let readFileSyncSpy: jest.SpyInstance;
    beforeAll(() => {
      readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
      execSyncSpy = jest.spyOn(childProcess, 'execSync').mockReturnValue('');
      fixupTsDeclarationsSpy = jest.spyOn(tsDeclarationsModule, 'fixupTsDeclarations').mockReturnValue('output');

      readFileSyncSpy.mockImplementation((p) => {
        if ((p as string).endsWith('package.json')) return JSON.stringify({ version: '1.2.3' });
        return mockInternalDeclarations;
      });

      result = buildTsDeclarations('https://github.com/microsoft/TypeScript.git', 'v1.2.3', '/test/dir', true);
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    test(`Checks out the specified version of TypeScript`, () => {
      expect(execSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining(`git clone --depth 1 --branch v1.2.3`),
        expect.objectContaining({ cwd: '/test/dir' })
      );
    });

    test(`Installs dependencies and builds TypeScript`, () => {
      expect(execSyncSpy).toHaveBeenCalledWith(
        'npm install --no-audit',
        expect.objectContaining({ cwd: '/test/dir' })
      );
      expect(execSyncSpy).toHaveBeenCalledWith(
        'npx hereby dts',
        expect.objectContaining({ cwd: '/test/dir' })
      );
    });

    test(`Calls fixup with version & content`, () => {
      expect(fixupTsDeclarationsSpy).toHaveBeenCalledWith('v1.2.3', mockInternalDeclarations);
    });

    test(`Returns fixed up content and version`, () => {
      expect(result).toEqual({ dtsContent: 'output', tsVersion: '1.2.3' });
    });
  });

  describe('fixupTsDeclarations()', () => {
    test('Transforms and verifies TypeScript declarations', () => {
      const result = fixupTsDeclarations('v1.2.3', mockInternalDeclarations);

      const whitespaceFixRegex = (s: string) => s.replace(/\s+/g, ' ');

      expect(whitespaceFixRegex(result)).toBe(whitespaceFixRegex(expectedOutputDeclarations));
    });

    test('Throws if diagnostics present', () => {
      expect(() => fixupTsDeclarations('v1.2.3', mockInternalDeclarations + '\ninvalid { };'))
        .toThrow('Transformed file has diagnostics errors:')
    });
  });
});

// endregion
