import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const parserCoreSource = fileURLToPath(new URL('./packages/parser-core/src/index.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@codestellation/parser-core': parserCoreSource
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
