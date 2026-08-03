import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div
          className="flex max-w-sm flex-col items-center gap-4 p-8 text-center"
          style={{ border: '1px solid #fecaca', borderRadius: 5 }}
        >
          <div
            className="flex size-10 items-center justify-center"
            style={{ background: '#fef2f2', borderRadius: 5 }}
          >
            <AlertTriangle size={20} style={{ color: '#b91c1c' }} />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900">Something went wrong</p>
            <p className="mt-1 text-xs text-gray-400">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-extrabold text-white"
            style={{ background: '#b91c1c', borderRadius: 5 }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
