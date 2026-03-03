import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'
import { BrowserManager } from '../browser/manager'

export function createMcpServer(browser: BrowserManager): McpServer {
  const server = new McpServer({
    name: 'code2vision',
    version: '0.1.0'
  })

  // --- take_screenshot ---
  server.tool(
    'take_screenshot',
    'Captures a screenshot of the current browser render. Returns a base64-encoded PNG.',
    {
      url: z.string().url().optional().describe('Navigate to this URL before capturing. Defaults to current page.'),
      selector: z.string().optional().describe('CSS selector to capture a specific element'),
      fullPage: z.boolean().optional().describe('Capture full scrollable page. Default: false')
    },
    async ({ url, selector, fullPage }) => {
      if (!browser.isReady()) await browser.launch()
      if (url) await browser.navigate(url)

      const base64 = await browser.screenshot({ selector, fullPage })

      return {
        content: [
          {
            type: 'image' as const,
            data: base64,
            mimeType: 'image/png'
          }
        ]
      }
    }
  )

  // --- get_console_logs ---
  server.tool(
    'get_console_logs',
    'Returns browser console logs captured since the last call. Flushes the buffer on each call.',
    {
      level: z.enum(['log', 'warn', 'error', 'info', 'debug', 'all']).optional()
        .describe('Filter by log level. Default: all')
    },
    async ({ level }) => {
      if (!browser.isReady()) {
        return {
          content: [{ type: 'text' as const, text: '[]' }]
        }
      }

      const logs = browser.flushLogs(level ?? 'all')

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(logs, null, 2)
          }
        ]
      }
    }
  )

  // --- get_dom_snapshot ---
  server.tool(
    'get_dom_snapshot',
    'Returns the current DOM structure as a JSON tree.',
    {
      selector: z.string().optional().describe('Root CSS selector. Default: body')
    },
    async ({ selector }) => {
      if (!browser.isReady()) await browser.launch()

      const dom = await browser.getDomSnapshot(selector ?? 'body')

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(dom, null, 2)
          }
        ]
      }
    }
  )

  // --- navigate ---
  server.tool(
    'navigate',
    'Navigates the browser to a URL or route.',
    {
      url: z.string().url().describe('Full URL to navigate to')
    },
    async ({ url }) => {
      if (!browser.isReady()) await browser.launch()
      await browser.navigate(url)

      return {
        content: [{ type: 'text' as const, text: `Navigated to ${url}` }]
      }
    }
  )

  // --- load_reference_image ---
  server.tool(
    'load_reference_image',
    `Loads a local design reference image (PNG, JPG, WEBP) so Claude can compare it against the browser render.
Use this when the design reference comes from a local file (exported from Figma, Penpot, Zeplin, Stitch, or any other tool).
Returns the image as base64 so Claude can visually diff it against take_screenshot().`,
    {
      filePath: z.string().describe('Absolute or workspace-relative path to the reference image file')
    },
    async ({ filePath }) => {
      const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

      if (!fs.existsSync(resolved)) {
        return {
          content: [{ type: 'text' as const, text: `Error: file not found at ${resolved}` }],
          isError: true
        }
      }

      const ext = path.extname(resolved).toLowerCase()
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp'
      }
      const mimeType = mimeMap[ext]
      if (!mimeType) {
        return {
          content: [{ type: 'text' as const, text: `Error: unsupported format ${ext}. Use PNG, JPG or WEBP.` }],
          isError: true
        }
      }

      const buffer = fs.readFileSync(resolved)
      const base64 = buffer.toString('base64')

      return {
        content: [
          {
            type: 'image' as const,
            data: base64,
            mimeType
          }
        ]
      }
    }
  )

  // --- wait_for_reload ---
  server.tool(
    'wait_for_reload',
    'Waits until the page has finished reloading (networkidle). Use after editing files.',
    {
      timeout: z.number().optional().describe('Timeout in milliseconds. Default: 5000')
    },
    async ({ timeout }) => {
      if (!browser.isReady()) {
        return {
          content: [{ type: 'text' as const, text: 'Browser not running, nothing to wait for.' }]
        }
      }

      await browser.waitForReload(timeout ?? 5000)

      return {
        content: [{ type: 'text' as const, text: 'Page reload complete.' }]
      }
    }
  )

  return server
}

export async function startStdioServer(browser: BrowserManager): Promise<void> {
  const server = createMcpServer(browser)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
