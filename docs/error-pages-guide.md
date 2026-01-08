# Error Pages Guide

This document explains the error pages available in the application for debugging and user experience.

## Available Error Pages

### 1. **404 - Not Found** (`app/not-found.tsx`)
- **When it appears**: When a user navigates to a route that doesn't exist
- **Features**:
  - Large 404 display
  - Debug information in development mode (pathname, full URL, referrer, timestamp)
  - Console logging for debugging
  - Quick navigation links
- **Usage**: Automatically triggered by Next.js for non-existent routes

### 2. **Error Boundary** (`app/error.tsx`)
- **When it appears**: When an error occurs in a page component or its children
- **Features**:
  - Error message display
  - Error digest (for production error tracking)
  - Stack trace (development mode only)
  - "Try Again" button to reset the error boundary
  - Console error logging
- **Usage**: Catches errors in the app directory (except root layout)

### 3. **Global Error Boundary** (`app/global-error.tsx`)
- **When it appears**: When an error occurs in the root layout
- **Features**:
  - Critical error handling
  - Full HTML structure (since root layout failed)
  - Error details and stack trace
  - Reset functionality
- **Usage**: Catches errors that occur in the root layout

### 4. **Dashboard Error Boundary** (`app/(dashboard)/error.tsx`)
- **When it appears**: When an error occurs in dashboard routes
- **Features**:
  - Dashboard-specific error handling
  - Error details and debugging info
  - Quick navigation back to dashboard
- **Usage**: Catches errors within the dashboard layout

### 5. **401 - Unauthorized** (`app/unauthorized/page.tsx`)
- **When it appears**: When a user tries to access a protected resource without proper authentication
- **Features**:
  - Clear unauthorized message
  - Explanation of why access was denied
  - Links to sign in, home, and help
  - Query parameter support for custom messages
- **Usage**: Can be manually navigated to or used in middleware/API routes

## Debugging Features

### Development Mode
In development mode (`NODE_ENV=development`), error pages show:
- Full stack traces
- Detailed error information
- Request path and URL details
- Timestamps and debugging context

### Production Mode
In production, error pages show:
- User-friendly error messages
- Error digests (for tracking)
- No sensitive stack traces
- Support contact information

## Using Error Pages

### Triggering 404
```typescript
// Automatically triggered for non-existent routes
// Or manually:
import { notFound } from 'next/navigation';
notFound();
```

### Triggering Error Boundary
```typescript
// Throw an error in a component
throw new Error('Something went wrong');
```

### Redirecting to Unauthorized
```typescript
// In middleware or API routes
import { redirect } from 'next/navigation';
redirect('/unauthorized?reason=You need admin access');
```

## Console Logging

All error pages log detailed information to the console:
- Error messages
- Stack traces
- Request paths
- Timestamps
- User context (when available)

Check browser console or server logs for debugging information.

## Best Practices

1. **Error Boundaries**: Use error boundaries to catch and handle errors gracefully
2. **User Experience**: Always provide clear messages and navigation options
3. **Debugging**: Use development mode features to debug issues
4. **Logging**: Check console logs for detailed error information
5. **Support**: Include contact/support links for persistent issues

## Troubleshooting Routing Issues

If you're experiencing routing issues:

1. Check the browser console for 404 errors
2. Look at the Network tab to see what routes are being requested
3. Check the middleware logs for redirects
4. Use the debug information in the 404 page (development mode)
5. Verify the route exists in the `app` directory structure
6. Check `middleware.ts` for route protection rules

## Example: Debugging a Missing Route

1. Navigate to the missing route
2. Check the 404 page debug information (development mode)
3. Verify the route structure matches the URL
4. Check middleware for redirects
5. Review console logs for additional context

