'use client';

import React, { Component, ReactNode } from 'react';
import { logger, copyLogsToClipboard, getLogBuffer } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    logger.app.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleCopyLogs = async (): Promise<void> => {
    try {
      await copyLogsToClipboard();
      alert('Logs copied to clipboard');
    } catch {
      alert('Failed to copy logs');
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const logCount = getLogBuffer().length;

      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center p-8">
          <div className="max-w-lg w-full text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-6">
              An error occurred while rendering the application.
            </p>
            {this.state.error && (
              <pre className="bg-gray-900 p-4 rounded text-left text-sm text-red-400 mb-6 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleCopyLogs}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Copy Logs ({logCount})
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
