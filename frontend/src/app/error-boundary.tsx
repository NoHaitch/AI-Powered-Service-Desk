import { Component, type ReactNode } from 'react'
import { TopLayout } from './layouts'
import { ErrorPage } from './public-pages'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed
      ? <TopLayout path="/error/500"><ErrorPage code={500} /></TopLayout>
      : this.props.children
  }
}
