import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryLabels {
  title: string;
  unexpectedError: string;
  retry: string;
}

class ErrorBoundaryImpl extends Component<
  ErrorBoundaryProps & { labels: ErrorBoundaryLabels },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { labels: ErrorBoundaryLabels }) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="p-8 text-center text-nim bg-nim-secondary rounded-lg border border-nim"
        >
          <h3 className="mt-0 mb-4 text-lg">
            {this.props.labels.title}
          </h3>
          <p className="mb-6 text-nim-muted">
            {this.state.error?.message || this.props.labels.unexpectedError}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-nim-primary text-nim-on-primary border-none rounded-md cursor-pointer text-sm hover:bg-nim-primary-hover"
          >
            {this.props.labels.retry}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  const { t } = useTranslation('dialogs');
  return (
    <ErrorBoundaryImpl
      {...props}
      labels={{
        title: t('error.generic_title'),
        unexpectedError: t('error.unknown_error'),
        retry: t('error.retry'),
      }}
    />
  );
}
