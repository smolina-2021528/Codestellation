import { defineConfig } from 'vitest/config';

export default defineConfig({
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
