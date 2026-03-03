import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserManager } from '../manager'

// vi.hoisted ensures these are available inside the vi.mock factory
const { mockPage, mockContext, mockBrowser } = vi.hoisted(() => {
  const mockPage = {
    on: vi.fn(),
    goto: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('fakepng')),
    locator: vi.fn().mockReturnValue({
      first: vi.fn().mockReturnValue({
        screenshot: vi.fn().mockResolvedValue(Buffer.from('fakeelement'))
      })
    }),
    evaluate: vi.fn().mockResolvedValue({ tag: 'body', children: [] }),
    waitForLoadState: vi.fn().mockResolvedValue(undefined)
  }
  const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage) }
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined)
  }
  return { mockPage, mockContext, mockBrowser }
})

vi.mock('playwright', () => ({
  chromium: { launch: vi.fn().mockResolvedValue(mockBrowser) }
}))

describe('BrowserManager', () => {
  let manager: BrowserManager

  beforeEach(() => {
    manager = new BrowserManager()
    vi.clearAllMocks()
    mockPage.on.mockReset()
    mockBrowser.newContext.mockResolvedValue(mockContext)
    mockContext.newPage.mockResolvedValue(mockPage)
  })

  describe('isReady()', () => {
    it('returns false before launch', () => {
      expect(manager.isReady()).toBe(false)
    })

    it('returns true after launch', async () => {
      await manager.launch()
      expect(manager.isReady()).toBe(true)
    })

    it('returns false after close', async () => {
      await manager.launch()
      await manager.close()
      expect(manager.isReady()).toBe(false)
    })
  })

  describe('launch()', () => {
    it('is idempotent — does not launch a second browser', async () => {
      const { chromium } = await import('playwright')
      await manager.launch()
      await manager.launch()
      expect(chromium.launch).toHaveBeenCalledTimes(1)
    })
  })

  describe('navigate()', () => {
    it('throws when browser is not launched', async () => {
      await expect(manager.navigate('http://localhost:5173')).rejects.toThrow(
        'Browser not launched. Call launch() first.'
      )
    })

    it('calls page.goto with networkidle', async () => {
      await manager.launch()
      await manager.navigate('http://localhost:5173')
      expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:5173', { waitUntil: 'networkidle' })
    })
  })

  describe('flushLogs()', () => {
    it('returns empty array when no logs collected', () => {
      expect(manager.flushLogs()).toEqual([])
    })

    it('clears the buffer on each call', () => {
      expect(manager.flushLogs('all')).toEqual([])
      expect(manager.flushLogs('all')).toEqual([])
    })

    it('filters logs by level and clears buffer', async () => {
      await manager.launch()
      const consoleHandler = mockPage.on.mock.calls
        .find(([event]: [string]) => event === 'console')?.[1]

      consoleHandler?.({ type: () => 'error', text: () => 'an error' })
      consoleHandler?.({ type: () => 'warn', text: () => 'a warning' })
      consoleHandler?.({ type: () => 'log', text: () => 'a log' })

      const errors = manager.flushLogs('error')
      expect(errors).toHaveLength(1)
      expect(errors[0].level).toBe('error')
      expect(errors[0].message).toBe('an error')
      expect(manager.flushLogs('all')).toHaveLength(0)
    })

    it('normalizes unknown console types to "log"', async () => {
      await manager.launch()
      const consoleHandler = mockPage.on.mock.calls
        .find(([event]: [string]) => event === 'console')?.[1]

      consoleHandler?.({ type: () => 'table', text: () => 'table output' })
      const logs = manager.flushLogs('all')
      expect(logs[0].level).toBe('log')
    })
  })

  describe('screenshot()', () => {
    it('returns base64 string', async () => {
      await manager.launch()
      const result = await manager.screenshot()
      expect(result).toBe(Buffer.from('fakepng').toString('base64'))
    })

    it('uses element locator when selector is provided', async () => {
      await manager.launch()
      await manager.screenshot({ selector: '#app' })
      expect(mockPage.locator).toHaveBeenCalledWith('#app')
    })

    it('passes fullPage option to page.screenshot', async () => {
      await manager.launch()
      await manager.screenshot({ fullPage: true })
      expect(mockPage.screenshot).toHaveBeenCalledWith({ fullPage: true })
    })
  })

  describe('close()', () => {
    it('resets isReady and clears logs', async () => {
      await manager.launch()
      await manager.close()
      expect(manager.isReady()).toBe(false)
      expect(manager.flushLogs()).toEqual([])
    })
  })
})
