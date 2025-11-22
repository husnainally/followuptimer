"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { ControlledInput } from "@/components/controlled-input";
import { LoadingButton } from "@/components/loading-button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session check error:", error);
          toast.error(
            "Session expired. Please request a new password reset link."
          );
          router.push("/forgot-password");
          return;
        }

        if (!session) {
          toast.error(
            "No active session. Please request a new password reset link."
          );
          router.push("/forgot-password");
          return;
        }

        setIsAuthenticated(true);
      } catch (err: any) {
        console.error("Error checking session:", err);
        toast.error("Unable to verify session. Please try again.");
        router.push("/forgot-password");
      } finally {
        setIsChecking(false);
      }
    }

    checkSession();
  }, [router]);

  async function onSubmit(data: UpdatePasswordFormData) {
    setIsLoading(true);
    const toastId = toast.loading("Updating password...");

    try {
      const supabase = createClient();

      // Verify session again before updating
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error(
          "Session expired. Please request a new password reset link."
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      toast.success("Password updated successfully! Redirecting...", {
        id: toastId,
      });

      // Small delay to show success message
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password", { id: toastId });
      setIsLoading(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Reset Your Password</h1>
          <p className="text-muted-foreground">Enter your new password below</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ControlledInput
              name="password"
              label="New Password"
              type="password"
              placeholder="••••••••"
              description="At least 8 characters, uppercase, lowercase, and number"
              required
            />

            <ControlledInput
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              required
            />

            <LoadingButton
              type="submit"
              className="w-full"
              isLoading={isLoading}
              loadingText="Updating..."
            >
              Update Password
            </LoadingButton>

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign In
              </Link>
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
