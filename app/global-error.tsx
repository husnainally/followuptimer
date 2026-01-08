'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Global Error (Root Layout):', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 bg-background">
          <div className="mx-auto max-w-2xl w-full">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-4">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Critical Error
              </h1>
              <p className="text-muted-foreground">
                A critical error occurred in the root layout. The application cannot continue.
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Error Information</CardTitle>
                <CardDescription>
                  This error occurred in the root layout and requires immediate attention.
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
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Please refresh the page or contact support if the issue persists.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

