import { AuthLayout } from "../auth-layout";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login - FollowUpTimer",
  description: "Sign in to your FollowUpTimer account",
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in to your account"
      description="Welcome back! Please enter your details to continue."
      sideEyebrow="Productivity Tool"
      sideTitle={
        <>
          Never miss a <span className="italic font-semibold">follow-up</span> again
        </>
      }
      sideSubtitle="Effortless reminders, perfectly timed. Stay consistent and build better habits without the overwhelm."
      sideQuote='"FollowUpTimer sits quietly in my workflow, supporting me in the background while I focus on what matters most."'
      sideQuoteAuthor="Alex Rivera"
      sideQuoteRole="Product Manager"
    >
      <LoginForm />
    </AuthLayout>
  );
}
