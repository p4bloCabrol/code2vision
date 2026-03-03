import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vscode', () => ({
  window: {
    createStatusBarItem: vi.fn().mockReturnValue({ text: '', tooltip: '', command: '', show: vi.fn() }),
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    createTerminal: vi.fn().mockReturnValue({ show: vi.fn(), sendText: vi.fn() })
  },
  commands: {
    registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    executeCommand: vi.fn().mockResolvedValue(undefined)
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/fake/workspace' } }],
    getConfiguration: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue('http://localhost:5173') }),
    openTextDocument: vi.fn().mockResolvedValue({})
  },
  StatusBarAlignment: { Right: 1 },
  ViewColumn: { Beside: 2 },
  Uri: { joinPath: vi.fn(), file: vi.fn() }
}))

vi.mock('fs')
vi.mock('../webview/panel', () => ({
  PreviewPanel: { createOrShow: vi.fn() }
}))

import * as vscode from 'vscode'
import * as fs from 'fs'
import { activate } from '../extension'

function makeContext(opts: { firstInstall?: boolean; extensionPath?: string } = {}) {
  const { firstInstall = false, extensionPath = '/fake/ext' } = opts
  return {
    extensionPath,
    extensionUri: {},
    subscriptions: { push: vi.fn() },
    globalState: {
      get: vi.fn().mockReturnValue(firstInstall ? undefined : true),
      update: vi.fn().mockResolvedValue(undefined)
    }
  } as unknown as vscode.ExtensionContext
}

describe('activate()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(true)
  })

  it('registers 5 commands', () => {
    activate(makeContext())
    expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(5)
  })

  it('creates and shows a status bar item', () => {
    activate(makeContext())
    const bar = vi.mocked(vscode.window.createStatusBarItem).mock.results[0].value
    expect(bar.show).toHaveBeenCalled()
  })

  it('opens walkthrough on first install', () => {
    activate(makeContext({ firstInstall: true }))
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.openWalkthrough',
      expect.stringContaining('gettingStarted'),
      false
    )
  })

  it('does not show mcp.json prompt on first install', () => {
    activate(makeContext({ firstInstall: true }))
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
  })

  it('shows prompt when .mcp.json is missing on subsequent activation', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    activate(makeContext())
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('.mcp.json'),
      'Setup .mcp.json',
      'Getting Started'
    )
  })

  it('does not show prompt when .mcp.json already exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    activate(makeContext())
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
  })
})

describe('setupMcp command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.readFileSync).mockReturnValue('{}')
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(undefined)
  })

  function getSetupMcpHandler() {
    activate(makeContext({ extensionPath: '/ext' }))
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls
    return calls.find(([cmd]) => cmd === 'code2vision.setupMcp')![1] as () => void
  }

  it('writes .mcp.json with correct structure', () => {
    const written: string[] = []
    vi.mocked(fs.writeFileSync).mockImplementation((_p, data) => written.push(data as string))
    getSetupMcpHandler()()
    const config = JSON.parse(written[0])
    expect(config.mcpServers['code2vision'].command).toBe('node')
    expect(config.mcpServers['code2vision'].args[0]).toContain('server-entry.js')
    expect(config.mcpServers['code2vision'].env.NODE_PATH).toContain('node_modules')
  })

  it('preserves existing servers when merging', () => {
    const existing = { mcpServers: { figma: { command: 'npx', args: [] } } }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existing))
    const written: string[] = []
    vi.mocked(fs.writeFileSync).mockImplementation((_p, data) => written.push(data as string))
    getSetupMcpHandler()()
    const config = JSON.parse(written[0])
    expect(config.mcpServers.figma).toBeDefined()
    expect(config.mcpServers['code2vision']).toBeDefined()
  })

  it('shows error when no workspace is open', () => {
    vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValue(undefined)
    getSetupMcpHandler()()
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('No workspace folder')
    )
  })
})
