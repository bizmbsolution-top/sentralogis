import { configDefaults, defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['lib/__tests__/**/*.test.ts'],
    // ADR-091 and ADR-092 are legacy callable suites, not Vitest test files.
    // They are imported by task03-regression-foundation.test.ts and must not
    // be independently collected as empty test suites.
    exclude: [
      ...configDefaults.exclude,
      'lib/__tests__/adr091-copilot-domain-mutation-authority.test.ts',
      'lib/__tests__/adr092-phase3-assign-driver-e2e.test.ts',
    ],
    environment: 'node',
  },
})
