import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    // Clear error state and reload
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-5">
          <div className="text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-bold text-slate-100 mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-400 mb-6">
              Don't worry, it happens to the best of us.
            </p>
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-400 transition-all"
            >
              Tap to Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;