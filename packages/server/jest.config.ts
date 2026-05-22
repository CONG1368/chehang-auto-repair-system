import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  collectCoverageFrom: [
    'src/modules/**/*.service.ts',
    'src/modules/**/*.controller.ts',
  ],
  coverageDirectory: './coverage',
};

export default config;
