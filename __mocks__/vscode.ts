// Shared manual mock for the 'vscode' module.
// Individual tests can override specific methods with vi.fn() via vi.mocked().
export const window = {
  createStatusBarItem: () => ({ text: '', tooltip: '', command: '', show: () => {} }),
  showInformationMessage: () => Promise.resolve(undefined),
  showErrorMessage: () => Promise.resolve(undefined),
  createTerminal: () => ({ show: () => {}, sendText: () => {} }),
  createWebviewPanel: () => ({})
}

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: () => Promise.resolve(undefined)
}

export const workspace = {
  workspaceFolders: [{ uri: { fsPath: '/fake/workspace' } }],
  getConfiguration: () => ({ get: () => undefined }),
  openTextDocument: () => Promise.resolve({})
}

export const StatusBarAlignment = { Left: 1, Right: 2 }
export const ViewColumn = { Active: 1, Beside: 2, One: 1 }
export const Uri = {
  joinPath: (..._args: unknown[]) => ({ fsPath: '/fake/path' }),
  file: (p: string) => ({ fsPath: p })
}
