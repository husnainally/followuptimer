import { AuthLayout } from "../auth-layout";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset Password - FollowUpTimer",
  description: "Reset your FollowUpTimer password",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email associated with your account."
      sideEyebrow="Security first"
      sideTitle={
        <>
          Get back on <span className="italic font-semibold">track</span>
        </>
      }
      sideSubtitle="We make it simple to recover access while keeping your workspace secure."
      sideQuote='"The reset flow was seamless—our team was back in within minutes."'
      sideQuoteAuthor="Priya Menon"
      sideQuoteRole="Customer Support Lead"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
