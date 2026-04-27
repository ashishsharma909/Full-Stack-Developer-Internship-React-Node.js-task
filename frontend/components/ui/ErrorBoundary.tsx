'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}

/**
 * ErrorBoundary catches React render errors in dynamic components.
 * Without this, a broken DynamicForm would crash the entire page.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-400">
            {this.props.componentName ?? 'Component'} failed to render
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            {this.state.error?.message}
          </p>
          <button
            className="mt-4 text-xs text-brand-400 hover:text-brand-300 underline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
