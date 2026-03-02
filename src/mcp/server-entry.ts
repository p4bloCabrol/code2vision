/**
 * Standalone entry point for the MCP server.
 * Claude Code launches this process via stdio transport.
 *
 * Usage in .mcp.json:
 * {
 *   "mcpServers": {
 *     "code2vision": {
 *       "command": "node",
 *       "args": ["<extensionPath>/dist/mcp-server.js"]
 *     }
 *   }
 * }
 */
import { BrowserManager } from '../browser/manager'
import { startStdioServer } from './server'

const browser = new BrowserManager()

process.on('SIGINT', async () => {
  await browser.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await browser.close()
  process.exit(0)
})

startStdioServer(browser).catch((err: unknown) => {
  console.error('MCP server error:', err)
  process.exit(1)
})
