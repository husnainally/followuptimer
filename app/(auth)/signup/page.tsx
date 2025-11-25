import { AuthLayout } from "../auth-layout";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Sign Up - FollowUpTimer",
  description: "Create your FollowUpTimer account",
};

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      description="Start streamlining your follow-ups today. Get started in seconds."
      sideEyebrow="Calm Productivity"
      sideTitle={
        <>
          Follow through at the <span className="italic font-semibold">right moment</span>
        </>
      }
      sideSubtitle="One-click reminders, real-time notifications, and optional affirmations. Stay organized without adding stress or complexity."
      sideQuote={`"FollowUpTimer helps me stay consistent and build better habits. It's lightweight, simple, and never overwhelming."`}
      sideQuoteAuthor="Olivia"
      sideQuoteRole="Founder"
    >
      <SignupForm />
    </AuthLayout>
  );
}
