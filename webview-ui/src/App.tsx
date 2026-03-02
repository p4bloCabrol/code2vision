import StatusPanel from './StatusPanel'
import LogsPanel from './LogsPanel'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>code2vision</h1>
      </header>
      <main className="app-main">
        <StatusPanel />
        <LogsPanel />
      </main>
    </div>
  )
}
