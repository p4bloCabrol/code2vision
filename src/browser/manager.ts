import { Browser, BrowserContext, Page, chromium, ConsoleMessage } from 'playwright'

export interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
}

export class BrowserManager {
  private browser: Browser | undefined
  private context: BrowserContext | undefined
  private page: Page | undefined
  private logs: ConsoleLog[] = []

  async launch(): Promise<void> {
    if (this.browser) return

    this.browser = await chromium.launch({ headless: true })
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    })
    this.page = await this.context.newPage()

    this.page.on('console', (msg: ConsoleMessage) => {
      const level = msg.type() as ConsoleLog['level']
      this.logs.push({
        level: ['log', 'warn', 'error', 'info', 'debug'].includes(level) ? level : 'log',
        message: msg.text(),
        timestamp: Date.now()
      })
    })

    this.page.on('pageerror', (error: Error) => {
      this.logs.push({
        level: 'error',
        message: error.message,
        timestamp: Date.now()
      })
    })
  }

  private assertReady(): Page {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.')
    }
    return this.page
  }

  async navigate(url: string): Promise<void> {
    const page = this.assertReady()
    await page.goto(url, { waitUntil: 'networkidle' })
  }

  async screenshot(options: {
    selector?: string
    fullPage?: boolean
  } = {}): Promise<string> {
    const page = this.assertReady()

    let buffer: Buffer

    if (options.selector) {
      const element = await page.locator(options.selector).first()
      buffer = await element.screenshot()
    } else {
      buffer = await page.screenshot({ fullPage: options.fullPage ?? false })
    }

    return buffer.toString('base64')
  }

  async getDomSnapshot(selector = 'body'): Promise<unknown> {
    const page = this.assertReady()

    return page.evaluate((sel: string) => {
      function serialize(el: Element): unknown {
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          classes: el.className ? el.className.split(' ').filter(Boolean) : undefined,
          text: el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE
            ? el.textContent?.trim()
            : undefined,
          children: Array.from(el.children).map(serialize)
        }
      }
      const root = document.querySelector(sel)
      return root ? serialize(root) : null
    }, selector)
  }

  async waitForReload(timeout = 5000): Promise<void> {
    const page = this.assertReady()
    await page.waitForLoadState('networkidle', { timeout })
  }

  flushLogs(level: ConsoleLog['level'] | 'all' = 'all'): ConsoleLog[] {
    const filtered = level === 'all'
      ? [...this.logs]
      : this.logs.filter(l => l.level === level)
    this.logs = []
    return filtered
  }

  async close(): Promise<void> {
    await this.browser?.close()
    this.browser = undefined
    this.context = undefined
    this.page = undefined
    this.logs = []
  }

  isReady(): boolean {
    return this.page !== undefined
  }
}
