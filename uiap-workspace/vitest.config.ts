import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: [
      'packages/*/src/**/*.test.ts',
      'modules/*/src/**/*.test.ts',
      'apps/edge-api/src/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
