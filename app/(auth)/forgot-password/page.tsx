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
      description="Enter your email address and we'll send you a link to reset your password."
      sideEyebrow="Simple Recovery"
      sideTitle={
        <>
          Get back on <span className="italic font-semibold">track</span>
        </>
      }
      sideSubtitle="We'll help you recover access quickly so you can return to staying consistent with your follow-ups."
      sideQuote='"The reset process was seamless. I was back to my reminders in minutes, without any stress."'
      sideQuoteAuthor="Jordan Kim"
      sideQuoteRole="Freelance Consultant"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
