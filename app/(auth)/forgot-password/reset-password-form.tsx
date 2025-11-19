"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField
} from "@/components/ui/form";
import { ControlledInput } from "@/components/controlled-input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ResetPasswordFormData, resetPasswordSchema } from "@/lib/schemas";

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormData) {
    setIsLoading(true);
    setError("");
    try {
      // TODO: Integrate with Supabase auth
      // const { error } = await supabase.auth.resetPasswordForEmail(
      //   data.email,
      //   {
      //     redirectTo: `${window.location.origin}/auth/update-password`,
      //   }
      // );
      // if (error) throw error;
      
      console.log("Reset password request for:", data.email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="text-muted-foreground">
            We've sent a password reset link to your email address.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-block text-primary hover:underline font-medium"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        <ControlledInput
          name="email"
          label="Email Address"
          type="email"
          placeholder="your@email.com"
          required
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Reset Link"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </form>
    </Form>
  );
}
