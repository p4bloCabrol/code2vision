import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { PreviewPanel } from './webview/panel'

const STATE_KEY_INSTALLED = 'code2vision.firstInstall'

export function activate(context: vscode.ExtensionContext): void {
  // Status bar item
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.text = '$(eye) code2vision'
  statusBar.tooltip = 'code2vision — click to open panel'
  statusBar.command = 'code2vision.openPreview'
  statusBar.show()
  context.subscriptions.push(statusBar)

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('code2vision.openPreview', () => {
      PreviewPanel.createOrShow(context.extensionUri)
    }),

    vscode.commands.registerCommand('code2vision.showLogs', () => {
      PreviewPanel.createOrShow(context.extensionUri)
    }),

    vscode.commands.registerCommand('code2vision.setupMcp', () => {
      setupMcpConfig(context.extensionPath)
    }),

    vscode.commands.registerCommand('code2vision.installPlaywright', () => {
      const terminal = vscode.window.createTerminal('code2vision setup')
      terminal.show()
      terminal.sendText('npx playwright install chromium')
    }),

    vscode.commands.registerCommand('code2vision.openWalkthrough', () => {
      void vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        'p4bloCabrol.code2vision#code2vision.gettingStarted',
        false
      )
    })
  )

  // First install → open walkthrough automatically
  const isFirstInstall = !context.globalState.get(STATE_KEY_INSTALLED)
  if (isFirstInstall) {
    void context.globalState.update(STATE_KEY_INSTALLED, true)
    void vscode.commands.executeCommand(
      'workbench.action.openWalkthrough',
      'p4bloCabrol.code2vision#code2vision.gettingStarted',
      false
    )
    return
  }

  // Subsequent activations → offer .mcp.json if missing
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders) {
    const mcpPath = path.join(workspaceFolders[0].uri.fsPath, '.mcp.json')
    if (!fs.existsSync(mcpPath)) {
      void vscode.window.showInformationMessage(
        'code2vision: No .mcp.json found in this workspace.',
        'Setup .mcp.json',
        'Getting Started'
      ).then(selection => {
        if (selection === 'Setup .mcp.json') setupMcpConfig(context.extensionPath)
        if (selection === 'Getting Started') {
          void vscode.commands.executeCommand('code2vision.openWalkthrough')
        }
      })
    }
  }
}

function setupMcpConfig(extensionPath: string): void {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders) {
    void vscode.window.showErrorMessage('code2vision: No workspace folder open.')
    return
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath
  const mcpPath = path.join(workspaceRoot, '.mcp.json')
  const serverEntryPath = path.join(extensionPath, 'dist', 'mcp', 'server-entry.js')

  let existing: Record<string, unknown> = {}
  if (fs.existsSync(mcpPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(mcpPath, 'utf-8')) as Record<string, unknown>
    } catch {
      // ignore, overwrite
    }
  }

  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {}
  mcpServers['code2vision'] = {
    command: 'node',
    args: [serverEntryPath],
    env: {
      NODE_PATH: path.join(extensionPath, 'node_modules')
    }
  }
  existing.mcpServers = mcpServers

  fs.writeFileSync(mcpPath, JSON.stringify(existing, null, 2))

  void vscode.window.showInformationMessage(
    'code2vision: .mcp.json ready. Restart Claude Code in this workspace to connect.',
    'Open .mcp.json'
  ).then(selection => {
    if (selection === 'Open .mcp.json') {
      void vscode.workspace.openTextDocument(mcpPath).then(doc => {
        void vscode.window.showTextDocument(doc)
      })
    }
  })
}

export function deactivate(): void {
  // Playwright runs in a separate MCP process managed by Claude Code
}
