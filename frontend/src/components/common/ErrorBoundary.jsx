import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F7F3] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-700 border border-rose-200">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-[#202D2B]">Something went wrong</h2>
              <p className="text-xs text-[#66746F] leading-relaxed">
                An unexpected application error occurred while rendering this page. Don't worry, your stored optical data is completely safe.
              </p>
            </div>

            {this.state.error && (
              <details className="text-left bg-[#F5F7F3] p-3 rounded-xl border border-[#E2E7E3] text-[11px] text-[#66746F] font-mono overflow-x-auto">
                <summary className="cursor-pointer font-bold text-[#202D2B] hover:text-[#28766B] mb-1">
                  View Technical Stacktrace
                </summary>
                <div className="mt-2 text-rose-700 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </div>
              </details>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => (window.location.href = '/')}
                className="flex-1 py-2.5 px-4 bg-[#FEFEFC] border border-[#E2E7E3] hover:bg-[#F5F7F3] text-[#66746F] hover:text-[#202D2B] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> Go Dashboard
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

