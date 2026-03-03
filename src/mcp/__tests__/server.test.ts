import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BrowserManager } from '../../browser/manager'

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>

// vi.hoisted: runs before vi.mock hoisting, giving us shared state accessible
// both inside the mock factory and in the test bodies
const { registeredTools } = vi.hoisted(() => {
  const registeredTools = new Map<string, ToolHandler>()
  return { registeredTools }
})

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  // Use a real constructor function (not arrow) so `new McpServer()` works
  function McpServer() {
    (this as { tool: unknown }).tool = (
      name: string,
      _desc: string,
      _schema: unknown,
      handler: ToolHandler
    ) => {
      registeredTools.set(name, handler)
    }
  }
  return { McpServer }
})

vi.mock('../../browser/manager')
vi.mock('fs')
vi.mock('path')

import * as fs from 'fs'
import * as path from 'path'
import { createMcpServer } from '../server'

function makeMockBrowser(ready = true): BrowserManager {
  return {
    isReady: vi.fn().mockReturnValue(ready),
    launch: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue('base64data'),
    flushLogs: vi.fn().mockReturnValue([]),
    getDomSnapshot: vi.fn().mockResolvedValue({ tag: 'body', children: [] }),
    waitForReload: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  } as unknown as BrowserManager
}

describe('MCP Server tools', () => {
  let browser: BrowserManager

  beforeEach(() => {
    registeredTools.clear()
    browser = makeMockBrowser()
    createMcpServer(browser)
  })

  describe('take_screenshot', () => {
    it('launches browser if not ready', async () => {
      browser = makeMockBrowser(false)
      registeredTools.clear()
      createMcpServer(browser)
      await registeredTools.get('take_screenshot')!({})
      expect(browser.launch).toHaveBeenCalledOnce()
    })

    it('navigates when url param is provided', async () => {
      await registeredTools.get('take_screenshot')!({ url: 'http://localhost:3000' })
      expect(browser.navigate).toHaveBeenCalledWith('http://localhost:3000')
    })

    it('does not navigate when url is undefined', async () => {
      await registeredTools.get('take_screenshot')!({})
      expect(browser.navigate).not.toHaveBeenCalled()
    })

    it('returns image content with base64 data', async () => {
      const result = await registeredTools.get('take_screenshot')!({}) as { content: Array<{ type: string; data: string; mimeType: string }> }
      expect(result.content[0].type).toBe('image')
      expect(result.content[0].data).toBe('base64data')
      expect(result.content[0].mimeType).toBe('image/png')
    })

    it('passes selector and fullPage to screenshot', async () => {
      await registeredTools.get('take_screenshot')!({ selector: '#root', fullPage: true })
      expect(browser.screenshot).toHaveBeenCalledWith({ selector: '#root', fullPage: true })
    })
  })

  describe('get_console_logs', () => {
    it('returns empty array when browser is not ready', async () => {
      browser = makeMockBrowser(false)
      registeredTools.clear()
      createMcpServer(browser)
      const result = await registeredTools.get('get_console_logs')!({}) as { content: Array<{ text: string }> }
      expect(result.content[0].text).toBe('[]')
    })

    it('returns serialized logs', async () => {
      const fakeLogs = [{ level: 'error', message: 'boom', timestamp: 1 }];
      (browser.flushLogs as ReturnType<typeof vi.fn>).mockReturnValue(fakeLogs)
      const result = await registeredTools.get('get_console_logs')!({ level: 'all' }) as { content: Array<{ text: string }> }
      expect(JSON.parse(result.content[0].text)).toEqual(fakeLogs)
    })

    it('defaults to "all" when level is undefined', async () => {
      await registeredTools.get('get_console_logs')!({})
      expect(browser.flushLogs).toHaveBeenCalledWith('all')
    })

    it('passes level filter to flushLogs', async () => {
      await registeredTools.get('get_console_logs')!({ level: 'error' })
      expect(browser.flushLogs).toHaveBeenCalledWith('error')
    })
  })

  describe('navigate', () => {
    it('launches browser if not ready', async () => {
      browser = makeMockBrowser(false)
      registeredTools.clear()
      createMcpServer(browser)
      await registeredTools.get('navigate')!({ url: 'http://localhost:5173' })
      expect(browser.launch).toHaveBeenCalledOnce()
    })

    it('returns confirmation text with url', async () => {
      const result = await registeredTools.get('navigate')!({ url: 'http://localhost:5173' }) as { content: Array<{ text: string }> }
      expect(result.content[0].text).toContain('http://localhost:5173')
    })
  })

  describe('wait_for_reload', () => {
    it('returns early message when browser is not ready', async () => {
      browser = makeMockBrowser(false)
      registeredTools.clear()
      createMcpServer(browser)
      const result = await registeredTools.get('wait_for_reload')!({}) as { content: Array<{ text: string }> }
      expect(result.content[0].text).toContain('Browser not running')
    })

    it('defaults timeout to 5000ms', async () => {
      await registeredTools.get('wait_for_reload')!({})
      expect(browser.waitForReload).toHaveBeenCalledWith(5000)
    })

    it('passes custom timeout', async () => {
      await registeredTools.get('wait_for_reload')!({ timeout: 3000 })
      expect(browser.waitForReload).toHaveBeenCalledWith(3000)
    })
  })

  describe('load_reference_image', () => {
    it('returns error when file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(path.isAbsolute).mockReturnValue(true)
      const result = await registeredTools.get('load_reference_image')!({ filePath: '/tmp/nope.png' }) as { isError: boolean; content: Array<{ text: string }> }
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('file not found')
    })

    it('returns error for unsupported extension', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(path.isAbsolute).mockReturnValue(true)
      vi.mocked(path.extname).mockReturnValue('.gif')
      const result = await registeredTools.get('load_reference_image')!({ filePath: '/tmp/d.gif' }) as { isError: boolean; content: Array<{ text: string }> }
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('unsupported format')
    })

    it('returns image content for valid PNG', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(path.isAbsolute).mockReturnValue(true)
      vi.mocked(path.extname).mockReturnValue('.png')
      vi.mocked(path.resolve).mockReturnValue('/tmp/design.png')
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('pngdata') as unknown as string)
      const result = await registeredTools.get('load_reference_image')!({ filePath: '/tmp/design.png' }) as { content: Array<{ type: string; mimeType: string }> }
      expect(result.content[0].type).toBe('image')
      expect(result.content[0].mimeType).toBe('image/png')
    })
  })
})
