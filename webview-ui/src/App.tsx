import { useState, useEffect } from 'react'
import PreviewFrame from './PreviewFrame'
import StatusPanel from './StatusPanel'
import LogsPanel from './LogsPanel'

declare const acquireVsCodeApi: () => { postMessage: (msg: unknown) => void }
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null

export default function App() {
  const [devServerUrl, setDevServerUrl] = useState('http://localhost:5173')

  useEffect(() => {
    const handler = (event: MessageEvent<{ type: string; devServerUrl?: string }>) => {
      if (event.data.type === 'init' && event.data.devServerUrl) {
        setDevServerUrl(event.data.devServerUrl)
      }
    }
    window.addEventListener('message', handler)
    vscode?.postMessage({ type: 'ready' })
    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <div className="app">
      <div className="app-preview">
        <PreviewFrame url={devServerUrl} />
      </div>
      <div className="app-sidebar">
        <StatusPanel />
        <LogsPanel />
      </div>
    </div>
  )
}
