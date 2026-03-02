import * as vscode from 'vscode'
import { BrowserManager } from './browser/manager'
import { PreviewPanel } from './webview/panel'

let browserManager: BrowserManager | undefined

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  browserManager = new BrowserManager()

  context.subscriptions.push(
    vscode.commands.registerCommand('code2vision.openPreview', () => {
      PreviewPanel.createOrShow(context.extensionUri)
    }),

    vscode.commands.registerCommand('code2vision.startMcpServer', async () => {
      await browserManager!.launch()
      vscode.window.showInformationMessage('code2vision: Browser started, MCP server ready.')
    }),

    vscode.commands.registerCommand('code2vision.stopMcpServer', async () => {
      await browserManager!.close()
      vscode.window.showInformationMessage('code2vision: Browser stopped.')
    }),

    vscode.commands.registerCommand('code2vision.showLogs', () => {
      PreviewPanel.createOrShow(context.extensionUri)
    })
  )
}

export async function deactivate(): Promise<void> {
  await browserManager?.close()
}
