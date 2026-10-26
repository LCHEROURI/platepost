import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Rules/integration tests run under `firebase emulators:exec` (see test:rules script).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
