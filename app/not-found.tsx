'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft, FileQuestion, Bug } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const [debugInfo, setDebugInfo] = useState<{
    pathname: string;
    timestamp: string;
    userAgent: string;
    referrer: string;
  } | null>(null);

  useEffect(() => {
    // Collect debugging information
    setDebugInfo({
      pathname: pathname || window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'Direct navigation',
    });

    // Log for debugging
    console.warn('404 Not Found:', {
      pathname: pathname || window.location.pathname,
      fullUrl: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 bg-background">
      <div className="mx-auto max-w-2xl w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <FileQuestion className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-9xl font-bold text-primary/20 mb-4">404</h1>
          <h2 className="text-3xl font-semibold tracking-tight mb-2">
            Page Not Found
          </h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or the URL might be incorrect.
          </p>
        </div>

        {debugInfo && process.env.NODE_ENV === 'development' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Debug Information
              </CardTitle>
              <CardDescription>
                Development mode debugging details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Requested Path
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded-md">
                  {debugInfo.pathname}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Full URL
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded-md break-all">
                  {typeof window !== 'undefined' ? window.location.href : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Referrer
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded-md break-all">
                  {debugInfo.referrer}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Timestamp
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded-md">
                  {debugInfo.timestamp}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center mb-6">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>

        <div className="pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Looking for something specific?
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/help">Help</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contact">Contact</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

