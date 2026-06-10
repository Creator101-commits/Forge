import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[Forge] Error boundary caught:", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full items-center justify-center bg-bg-1">
            <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
              <div className="rounded-1 bg-warn/15 px-2 py-0.5 text-[10px] text-warn font-medium">
                Something went wrong
              </div>
              <p className="max-w-md text-xs text-text-2">{this.state.error.message}</p>
              <button
                onClick={() => this.setState({ error: null })}
                className="btn-secondary px-3 py-1 text-xs"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
