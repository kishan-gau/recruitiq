import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    if (import.meta.env.DEV) {
      // Basic logging; replace with app logger if available
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h1 className="text-xl font-semibold">Er ging iets mis</h1>
          <p className="mt-2 text-sm text-gray-600">Probeer de pagina te herladen.</p>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
