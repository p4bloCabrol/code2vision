import { useState, useEffect } from 'react'

type Status = 'idle' | 'running' | 'error'

interface StatusState {
  status: Status
  iteration: number
  maxIterations: number
  message: string
}

export default function StatusPanel() {
  const [state, setState] = useState<StatusState>({
    status: 'idle',
    iteration: 0,
    maxIterations: 10,
    message: 'Waiting for QA loop to start...'
  })

  useEffect(() => {
    const handler = (event: MessageEvent<{ type: string } & Partial<StatusState>>) => {
      const { type, ...data } = event.data
      if (type === 'status-update') {
        setState(prev => ({ ...prev, ...data }))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const statusColor: Record<Status, string> = {
    idle: 'var(--vscode-descriptionForeground)',
    running: 'var(--vscode-charts-green)',
    error: 'var(--vscode-charts-red)'
  }

  return (
    <section className="status-panel">
      <div className="status-row">
        <span className="status-dot" style={{ backgroundColor: statusColor[state.status] }} />
        <span className="status-label">{state.status.toUpperCase()}</span>
        {state.status === 'running' && (
          <span className="status-iteration">iter {state.iteration}/{state.maxIterations}</span>
        )}
      </div>
      <div className="status-message">{state.message}</div>
    </section>
  )
}
