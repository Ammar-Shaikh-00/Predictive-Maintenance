// components/GlobalErrorBoundary.jsx

import React from "react";
import ErrorRecoveryScreen from "./ErrorRecoveryScreen";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global App Error:", error);
    console.error(errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorRecoveryScreen error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;