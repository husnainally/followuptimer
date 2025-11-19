import { ReactNode } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
  stepNumber?: number;
  totalSteps?: number;
  title?: string;
  description?: string;
}

export function OnboardingLayout({
  children,
  stepNumber = 1,
  totalSteps = 2,
  title,
  description,
}: OnboardingLayoutProps) {
  const steps = Array.from({ length: totalSteps });

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4 py-10">
      <div className="w-full flex flex-col justify-center items-center max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <p className="text-md font-medium text-muted-foreground">
            Step {stepNumber} of {totalSteps}
          </p>
          <div className="flex justify-center gap-1">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`h-1 rounded-full transition-all ${
                  index < stepNumber ? "w-10 bg-primary" : "w-6 bg-muted"
                }`}
              />
            ))}
          </div>
          {title && <h1 className="text-4xl font-semibold">{title}</h1>}
          {description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        <div className="bg-card border w-2/3 rounded-3xl shadow-sm p-6 md:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
