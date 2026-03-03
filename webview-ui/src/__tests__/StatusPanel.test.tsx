import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import StatusPanel from '../StatusPanel'

function send(data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data }))
}

describe('StatusPanel', () => {
  it('renders idle state by default', () => {
    render(<StatusPanel />)
    expect(screen.getByText('IDLE')).toBeDefined()
    expect(screen.getByText('Waiting for QA loop to start...')).toBeDefined()
  })

  it('shows iteration counter when running', () => {
    render(<StatusPanel />)
    act(() => {
      send({ type: 'status-update', status: 'running', message: 'Taking screenshot', iteration: 2, maxIterations: 10 })
    })
    expect(screen.getByText('RUNNING')).toBeDefined()
    expect(screen.getByText('iter 2/10')).toBeDefined()
    expect(screen.getByText('Taking screenshot')).toBeDefined()
  })

  it('shows error state without iteration counter', () => {
    render(<StatusPanel />)
    act(() => {
      send({ type: 'status-update', status: 'error', message: 'Screenshot failed', iteration: 3, maxIterations: 10 })
    })
    expect(screen.getByText('ERROR')).toBeDefined()
    expect(screen.getByText('Screenshot failed')).toBeDefined()
    expect(screen.queryByText(/iter/)).toBeNull()
  })

  it('does not show iteration counter when idle', () => {
    render(<StatusPanel />)
    expect(screen.queryByText(/iter/)).toBeNull()
  })

  it('ignores messages with unknown type', () => {
    render(<StatusPanel />)
    act(() => {
      send({ type: 'unrelated-event', status: 'error' })
    })
    expect(screen.getByText('IDLE')).toBeDefined()
  })
})
