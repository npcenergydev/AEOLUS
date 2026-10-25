import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AEOLUS Trading Desk caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6 flex-shrink-0" />
              <h2 className="text-lg font-bold text-slate-900">Trading Desk Application Error</h2>
            </div>
            <p className="text-xs text-slate-600">
              A component error occurred while rendering the dashboard.
            </p>
            {this.state.error && (
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[11px] font-mono text-rose-700 overflow-x-auto">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reload Trading Desk</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
