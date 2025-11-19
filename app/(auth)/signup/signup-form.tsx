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
import { toast } from "sonner";
import { SignupFormData, signupSchema } from "@/lib/schemas";
import { LoadingButton } from "@/components/loading-button";

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true);
    setError("");
    const toastId = toast.loading("Creating your account...");
    try {
      // TODO: Integrate with Supabase auth
      // const { error } = await supabase.auth.signUp({
      //   email: data.email,
      //   password: data.password,
      //   options: {
      //     emailRedirectTo: `${window.location.origin}/auth/callback`,
      //   },
      // });
      // if (error) throw error;
      
      console.log("Signup attempt with:", data);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success("Account created successfully", { id: toastId });
      // Redirect to onboarding after successful signup
      // router.push("/onboarding/tone");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
      toast.error(err.message || "Failed to create account", { id: toastId });
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
          loadingText="Creating account..."
        >
          Sign Up
        </LoadingButton>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </form>
    </Form>
  );
}
