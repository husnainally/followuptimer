import { NotificationsSetup } from "./notifications-setup";
import { OnboardingLayout } from "../layout";

export const metadata = {
  title: "Notification Preferences | FollowUpTimer",
  description: "Set up your notification preferences",
};

export default function NotificationsStep() {
  return (
    <OnboardingLayout
      stepNumber={2}
      totalSteps={2}
      title="Notification preferences"
      description="Tell us how you'd like to stay in the loop. You can change this anytime in settings."
    >
      <NotificationsSetup />
    </OnboardingLayout>
  );
}
