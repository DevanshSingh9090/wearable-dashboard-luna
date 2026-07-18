import { Component } from "react";

// Class component required — React error boundaries only work with
// componentDidCatch/getDerivedStateFromError, no hook equivalent exists yet.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[dashboard] render error caught by boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="dashboard">
          <div className="banner banner--warning">
            Something went wrong rendering the dashboard. Try refreshing — the stream and backend are
            unaffected.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;