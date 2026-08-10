import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const graphModelSource = fileURLToPath(new URL('./packages/graph-model/src/index.ts', import.meta.url));
const parserCoreSource = fileURLToPath(new URL('./packages/parser-core/src/index.ts', import.meta.url));
const repositoryScannerSource = fileURLToPath(new URL('./packages/repository-scanner/src/index.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@codestellation/graph-model': graphModelSource,
      '@codestellation/parser-core': parserCoreSource,
      '@codestellation/repository-scanner': repositoryScannerSource
    }
  },
  test: {
    environment: 'node',
    globals: false,
    include: [
      'apps/**/test/**/*.test.ts',
      'apps/**/test/**/*.spec.ts',
      'packages/**/test/**/*.test.ts',
      'packages/**/test/**/*.spec.ts',
      'scripts/**/*.test.ts'
    ],
    exclude: [
      '**/dist/**',
      '**/node_modules/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        '**/dist/**',
        '**/node_modules/**',
        '**/*.config.ts',
        '**/test/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    }
  }
});
