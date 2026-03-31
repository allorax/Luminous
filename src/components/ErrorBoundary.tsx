import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-background/50 backdrop-blur-xl border-white/5">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
              <p className="text-sm text-muted-foreground">
                {this.props.fallbackMessage || 'This widget encountered an error.'}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="text-xs text-primary underline hover:no-underline"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
