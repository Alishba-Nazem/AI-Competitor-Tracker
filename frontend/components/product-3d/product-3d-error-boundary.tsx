"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: unknown) => void;
};

type State = { hasError: boolean };

/**
 * Suspense only catches loading, not render/runtime errors from the R3F
 * tree (e.g. a WebGL context that fails to init). This boundary keeps a
 * broken 3D scene from taking down the product page.
 */
export class Product3DErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: Props) {
    // Allow retrying by remounting children after a key change from the parent.
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
