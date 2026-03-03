import * as vscode from 'vscode'

export type PanelMessage =
  | { type: 'status-update'; status: 'idle' | 'running' | 'error'; message: string; iteration?: number; maxIterations?: number }
  | { type: 'logs-push'; logs: Array<{ level: string; message: string; timestamp: number }> }
  | { type: 'logs-clear' }
  | { type: 'screenshot-taken'; dataUrl: string }

export class PreviewPanel {
  static currentPanel: PreviewPanel | undefined
  private readonly _panel: vscode.WebviewPanel
  private _disposables: vscode.Disposable[] = []
  private _devServerUrl: string

  static createOrShow(extensionUri: vscode.Uri): PreviewPanel {
    const config = vscode.workspace.getConfiguration('code2vision')
    const devServerUrl = config.get<string>('devServerUrl') ?? 'http://localhost:5173'

    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside)
      return PreviewPanel.currentPanel
    }

    const panel = vscode.window.createWebviewPanel(
      'code2vision',
      'code2vision',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        // Allow loading the dev server in an iframe
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview-ui')]
      }
    )

    PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, devServerUrl)
    return PreviewPanel.currentPanel
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, devServerUrl: string) {
    this._panel = panel
    this._devServerUrl = devServerUrl
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)
    this._panel.webview.html = this._getHtml(extensionUri)

    this._panel.webview.onDidReceiveMessage(
      (message: { type: string }) => {
        if (message.type === 'ready') {
          // Send initial config to webview
          void this._panel.webview.postMessage({
            type: 'init',
            devServerUrl: this._devServerUrl
          })
        }
      },
      null,
      this._disposables
    )
  }

  send(message: PanelMessage): void {
    void this._panel.webview.postMessage(message)
  }

  private _getHtml(extensionUri: vscode.Uri): string {
    const webview = this._panel.webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview-ui', 'index.js')
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview-ui', 'index.css')
    )
    const nonce = getNonce()

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} 'unsafe-inline';
             script-src 'nonce-${nonce}';
             frame-src http://localhost:* http://127.0.0.1:*;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>code2vision</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }

  dispose(): void {
    PreviewPanel.currentPanel = undefined
    this._panel.dispose()
    while (this._disposables.length) {
      this._disposables.pop()?.dispose()
    }
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
