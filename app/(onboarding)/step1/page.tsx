import { OnboardingLayout } from "../layout";
import { ToneSelector } from "./tone-selector";


export const metadata = {
  title: "Choose Your Tone | FollowUpTimer",
  description: "Select your preferred affirmation tone",
};

export default function ToneStep() {
  return (
    <OnboardingLayout
      stepNumber={1}
      totalSteps={2}
      title="Choose your tone"
      description="Pick the voice that best matches how you want FollowUpTimer to sound."
    >
      <ToneSelector />
    </OnboardingLayout>
  );
}
