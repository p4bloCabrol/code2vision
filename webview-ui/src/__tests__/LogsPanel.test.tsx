import { describe, it, expect } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import LogsPanel from '../LogsPanel'

function send(data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data }))
}

describe('LogsPanel', () => {
  it('renders empty state by default', () => {
    render(<LogsPanel />)
    expect(screen.getByText('No logs yet')).toBeDefined()
  })

  it('displays logs from logs-update message', () => {
    render(<LogsPanel />)
    act(() => {
      send({ type: 'logs-update', logs: [{ level: 'error', message: 'TypeError: x is not defined', timestamp: 1 }] })
    })
    expect(screen.getByText('[ERROR]')).toBeDefined()
    expect(screen.getByText('TypeError: x is not defined')).toBeDefined()
  })

  it('clears logs on logs-clear message', () => {
    render(<LogsPanel />)
    act(() => {
      send({ type: 'logs-update', logs: [{ level: 'log', message: 'hello', timestamp: 1 }] })
    })
    act(() => {
      send({ type: 'logs-clear' })
    })
    expect(screen.getByText('No logs yet')).toBeDefined()
  })

  it('clears logs on Clear button click', () => {
    render(<LogsPanel />)
    act(() => {
      send({ type: 'logs-update', logs: [{ level: 'log', message: 'hello', timestamp: 1 }] })
    })
    fireEvent.click(screen.getByText('Clear'))
    expect(screen.getByText('No logs yet')).toBeDefined()
  })

  it('accumulates logs across multiple messages', () => {
    render(<LogsPanel />)
    act(() => {
      send({ type: 'logs-update', logs: [{ level: 'log', message: 'first', timestamp: 1 }] })
    })
    act(() => {
      send({ type: 'logs-update', logs: [{ level: 'warn', message: 'second', timestamp: 2 }] })
    })
    expect(screen.getByText('first')).toBeDefined()
    expect(screen.getByText('second')).toBeDefined()
  })

  it('caps log buffer at 200 entries', () => {
    render(<LogsPanel />)
    const manyLogs = Array.from({ length: 250 }, (_, i) => ({
      level: 'log' as const, message: `msg-${i}`, timestamp: i
    }))
    act(() => {
      send({ type: 'logs-update', logs: manyLogs })
    })
    const entries = screen.getAllByText(/^\[LOG\]$/)
    expect(entries.length).toBeLessThanOrEqual(200)
  })
})
