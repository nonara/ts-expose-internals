import type { Config } from '@jest/types';
import * as os from 'os';

const config: Config.InitialOptions = {
  testEnvironment: "node",
  preset: 'ts-jest',
  roots: [ '<rootDir>/test/tests' ],
  testRegex: '.*(test|spec)\\.tsx?$',
  moduleFileExtensions: [ 'ts', 'tsx', 'js', 'jsx', 'json', 'node' ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './test/tsconfig.json'
    }]
  },
  modulePaths: [ "<rootDir>/node_modules" ],
  // globalSetup: '<rootDir>/test/src/prepare.ts',
  // globalTeardown: '<rootDir>/test/src/cleanup.ts',
  testTimeout: 10000,
  maxConcurrency: os.cpus().length
}

export default config;
