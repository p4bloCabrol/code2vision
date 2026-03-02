import { useState, useEffect, useRef } from 'react'

interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
}

export default function LogsPanel() {
  const [logs, setLogs] = useState<ConsoleLog[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MessageEvent<{ type: string; logs?: ConsoleLog[] }>) => {
      if (event.data.type === 'logs-update' && event.data.logs) {
        setLogs(prev => [...prev, ...event.data.logs!].slice(-200))
      }
      if (event.data.type === 'logs-clear') {
        setLogs([])
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const levelColor: Record<ConsoleLog['level'], string> = {
    log: 'var(--vscode-foreground)',
    info: 'var(--vscode-charts-blue)',
    debug: 'var(--vscode-descriptionForeground)',
    warn: 'var(--vscode-charts-yellow)',
    error: 'var(--vscode-charts-red)'
  }

  return (
    <section className="logs-panel">
      <div className="logs-header">
        <span>Browser Console</span>
        <button onClick={() => setLogs([])}>Clear</button>
      </div>
      <div className="logs-body">
        {logs.length === 0 && (
          <div className="logs-empty">No logs yet</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="log-entry" style={{ color: levelColor[log.level] }}>
            <span className="log-level">[{log.level.toUpperCase()}]</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  )
}
