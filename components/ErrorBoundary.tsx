
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Fix: Extending Component directly from the named import to ensure standard React component members like setState and props are correctly recognized by the compiler.
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-200 p-6 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 rounded-xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                An unexpected error occurred. Our team has been notified.
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left overflow-hidden">
               <p className="text-xs font-semibold text-slate-400 mb-2">Error Details</p>
               <p className="text-xs font-mono text-rose-600 break-all">{this.state.error?.message || 'Unknown error'}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                // Fix: Access setState on the class instance (this) as defined in the Component base class.
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-4 bg-brand text-white rounded-2xl font-semibold text-xs shadow-xl shadow-brand/20 flex items-center justify-center gap-3 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button
                // Fix: Access setState on the class instance (this) as defined in the Component base class.
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-4 text-slate-400 hover:text-slate-600 font-semibold text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Fix: Correctly access the children prop in a React class component using this.props.
    return this.props.children;
  }
}

export default ErrorBoundary;
