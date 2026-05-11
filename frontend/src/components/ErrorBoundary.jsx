import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Uncaught error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            background: "#1c1c1f",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Something went wrong</h1>
          <p style={{ maxWidth: 420, opacity: 0.85, marginTop: "0.5rem" }}>
            We hit an unexpected error. Try reloading the page — if it keeps
            happening, let us know.
          </p>
          {this.state.error && (
            <pre
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1rem",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 8,
                maxWidth: 520,
                overflow: "auto",
                fontSize: "0.8rem",
              }}
            >
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              marginTop: "1.25rem",
              padding: "0.65rem 1.25rem",
              borderRadius: 999,
              border: "none",
              background: "#61d86b",
              color: "#0d2410",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;