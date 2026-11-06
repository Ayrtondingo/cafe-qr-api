import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: String.raw`.*\.spec\.ts$`,
  // TS151002: aviso de ts-jest por module nodenext sin isolatedModules (decoradores de Nest).
  transform: {
    [String.raw`^.+\.ts$`]: ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
  },
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
  collectCoverageFrom: ['**/*.ts', '!generated/**', '!main.ts', '!**/*.module.ts'],
  coverageDirectory: '../coverage',
};

export default config;
