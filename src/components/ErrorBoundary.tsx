import React from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Pushr ErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      let friendlyText = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          friendlyText = parsed.error.includes('Quota exceeded')
            ? 'Daily Firestore quota has been reached. Quota resets tomorrow.'
            : `Sync error (${parsed.operationType || 'database'}): ${parsed.error}`;
        }
      } catch {
        // plain string message
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#EAEAEF] dark:bg-[#0B0B0D]">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-[#17171B] p-8 shadow-sm border border-black/5 dark:border-white/10 text-center">
            <h2 className="font-sf-display text-2xl font-bold tracking-tight text-[#0A0A0C] dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#A1A1AA] mb-6 leading-relaxed">
              {friendlyText}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Pushr
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
