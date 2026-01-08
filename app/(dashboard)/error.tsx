'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console for debugging
    console.error('Dashboard Error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-2xl w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            An error occurred in the dashboard. Please try again.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Error Details</CardTitle>
            <CardDescription>
              Technical information for debugging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Error Message
              </p>
              <p className="text-sm font-mono bg-muted p-3 rounded-md break-all">
                {error.message || 'Unknown error'}
              </p>
            </div>
            {error.digest && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Error Digest
                </p>
                <p className="text-sm font-mono bg-muted p-3 rounded-md">
                  {error.digest}
                </p>
              </div>
            )}
            {error.stack && process.env.NODE_ENV === 'development' && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Stack Trace
                </p>
                <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto max-h-48">
                  {error.stack}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

