/**
 * Production error logger
 * Logs errors to console and can be extended to send to monitoring services
 */

interface ErrorContext {
  userId?: string;
  reminderId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

export function logError(
  error: unknown,
  context?: ErrorContext
): { message: string; stack?: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Always log to console in production for Vercel logs
  console.error('[Error]', {
    message: errorMessage,
    stack: errorStack,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });

  // TODO: Add external error tracking service integration
  // Examples: Sentry, LogRocket, Datadog, etc.
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { contexts: { custom: context } });
  // }

  return {
    message: errorMessage,
    stack: errorStack,
  };
}

export function logInfo(message: string, data?: Record<string, any>): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Info]', message, data);
  }
}

export function logWarning(message: string, data?: Record<string, any>): void {
  console.warn('[Warning]', {
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}
