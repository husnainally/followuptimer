"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';

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
import Link from "next/link";   
import { LoginFormData, loginSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { LoadingButton } from "@/components/loading-button";


export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    setError("");
    const toastId = toast.loading("Signing you in...");
    try {
      // TODO: Integrate with Supabase auth
      // const { error } = await supabase.auth.signInWithPassword({
      //   email: data.email,
      //   password: data.password,
      // });
      // if (error) throw error;

      console.log("Login attempt with:", data);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success("Signed in successfully", { id: toastId });
      // Redirect to dashboard after successful login
      // router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to login");
      toast.error(err.message || "Failed to login", { id: toastId });
    } finally {
      setIsLoading(false);
    }
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

        <ControlledInput
          name="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          required
        />

        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <LoadingButton
          type="submit"
          className="w-full"
          isLoading={isLoading}
          loadingText="Signing in..."
        >
          Sign In
        </LoadingButton>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Sign Up
          </Link>
        </p>
      </form>
    </Form>
  );
}
