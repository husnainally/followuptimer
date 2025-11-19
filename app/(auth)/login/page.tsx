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
      description="Welcome back! Please enter your details."
      sideEyebrow="Relationship CRM"
      sideTitle={
        <>
          Stay ahead of every <span className="italic font-semibold">follow-up</span>
        </>
      }
      sideSubtitle="Streamline outreach and never let a conversation slip through the cracks again."
      sideQuote='"FollowUpTimer helped us respond 2x faster and close more deals."'
      sideQuoteAuthor="Aisha Khan"
      sideQuoteRole="Revenue Operations Lead"
    >
      <LoginForm />
    </AuthLayout>
  );
}
