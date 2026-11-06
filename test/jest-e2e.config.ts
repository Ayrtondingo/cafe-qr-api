import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: String.raw`.*\.e2e-spec\.ts$`,
  // TS151002: aviso de ts-jest por module nodenext sin isolatedModules (decoradores de Nest).
  transform: {
    [String.raw`^.+\.ts$`]: ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
  },
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata', '<rootDir>/setup-env.ts'],
  globalSetup: '<rootDir>/global-setup.ts',
  // Los E2E comparten una base de datos real: se ejecutan en serie.
  maxWorkers: 1,
  testTimeout: 30_000,
};

export default config;
