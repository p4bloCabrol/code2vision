import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'webview-ui/src/**/*.tsx'],
      exclude: [
        'src/mcp/server-entry.ts',
        '**/__tests__/**',
        '**/*.d.ts'
      ]
    },
    projects: [
      {
        test: {
          name: 'extension',
          environment: 'node',
          include: ['src/**/__tests__/**/*.test.ts'],
          globals: true
        }
      },
      {
        test: {
          name: 'webview-ui',
          environment: 'jsdom',
          include: ['webview-ui/src/**/__tests__/**/*.test.tsx'],
          globals: true,
          setupFiles: ['webview-ui/src/__tests__/setup.ts']
        }
      }
    ]
  }
})
