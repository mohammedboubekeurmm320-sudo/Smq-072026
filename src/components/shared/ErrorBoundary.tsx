'use client'

import { Component, type ReactNode } from 'react'

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erreur d'affichage</h2>
          <pre className="text-sm bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-auto">
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: undefined }); window.location.reload() }}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded"
          >
            Recharger
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
