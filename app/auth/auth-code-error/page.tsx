"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthCodeError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  const getErrorMessage = () => {
    if (message) {
      return decodeURIComponent(message);
    }

    switch (error) {
      case "expired_token":
        return "This confirmation link has expired. Please request a new one.";
      case "invalid_token":
        return "This confirmation link is invalid. Please check your email for the latest link.";
      case "token_already_used":
        return "This confirmation link has already been used. Please try logging in.";
      case "no_code":
        return "No confirmation code was provided. Please check your email for the confirmation link.";
      default:
        return "There was a problem confirming your signup. Please try the confirmation link again or request a new one.";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Authentication Error</h1>
          <p className="text-muted-foreground">{getErrorMessage()}</p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/login">Return to Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/forgot-password">
                Request New Confirmation Email
              </Link>
            </Button>
          </div>

          {error && (
            <p className="text-xs text-muted-foreground">Error code: {error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
