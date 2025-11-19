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
      description="Please fill the form to create an account"
      sideEyebrow="Customer Success"
      sideTitle={
        <>
          Build stronger <span className="italic font-semibold">relationships</span>
        </>
      }
      sideSubtitle="Centralize follow-ups, keep handoffs smooth, and delight every customer."
      sideQuote='"FollowUpTimer keeps our onboarding touchpoints perfectly on track."'
      sideQuoteAuthor="Miguel Ortega"
      sideQuoteRole="Head of Customer Experience"
    >
      <SignupForm />
    </AuthLayout>
  );
}
