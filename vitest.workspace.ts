import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
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
])
