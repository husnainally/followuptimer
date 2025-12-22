"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlan } from "@/hooks/use-plan";
import { isInTrial, hasProAccess } from "@/lib/plans";
import {
  Crown,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

function PlanBadge({ planType }: { planType: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
    FREE: { variant: "secondary", label: "FREE" },
    PRO: { variant: "default", label: "PRO" },
    TEAM: { variant: "default", label: "TEAM" },
  };

  const config = variants[planType] || variants.FREE;

  return (
    <Badge variant={config.variant} className="text-sm px-3 py-1">
      {config.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon?: React.ReactNode }
  > = {
    none: { variant: "secondary", label: "No Subscription" },
    trialing: {
      variant: "default",
      label: "Trial Active",
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    active: {
      variant: "default",
      label: "Active",
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
    },
    past_due: {
      variant: "destructive",
      label: "Payment Required",
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
    },
    canceled: { variant: "secondary", label: "Canceled" },
    paused: { variant: "outline", label: "Paused" },
  };

  const config = variants[status] || variants.none;

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.icon}
      {config.label}
    </Badge>
  );
}

export function PlanSettings() {
  const { plan, entitlements, loading, error } = usePlan();
  const [trialLoading, setTrialLoading] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleStartTrial = async () => {
    try {
      setTrialLoading(true);
      const response = await fetch("/api/trials/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start trial");
      }

      toast.success("Trial started successfully! You now have PRO access.");
      // Reload page to refresh plan data
      window.location.reload();
    } catch (error) {
      console.error("Failed to start trial:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start trial. You may have already used your trial."
      );
    } finally {
      setTrialLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan & Subscription</CardTitle>
          <CardDescription>
            Unable to load plan information. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const inTrial = isInTrial(plan);
  const hasPro = hasProAccess(plan);
  const isDegraded = plan.subscription_status === "past_due" || plan.subscription_status === "paused";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Current Plan
              </CardTitle>
              <CardDescription className="mt-1">
                Your subscription plan and status
              </CardDescription>
            </div>
            <PlanBadge planType={plan.plan_type} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan Type</p>
              <p className="text-lg font-semibold">{plan.plan_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={plan.subscription_status} />
              </div>
            </div>
          </div>

          {plan.plan_started_at && (
            <div>
              <p className="text-sm text-muted-foreground">Plan Started</p>
              <p className="text-sm font-medium">
                {formatDate(plan.plan_started_at)}
              </p>
            </div>
          )}

          {inTrial && plan.trial_ends_at && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Trial Active</p>
                    <p className="text-sm text-muted-foreground">
                      Your trial ends on {formatDate(plan.trial_ends_at)}
                    </p>
                  </div>
                  <Badge variant="default" className="ml-2">
                    {Math.ceil(
                      (new Date(plan.trial_ends_at).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    days left
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isDegraded && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Subscription Requires Attention</p>
                <p className="text-sm mt-1">
                  Your subscription is {plan.subscription_status === "past_due" ? "past due" : "paused"}. 
                  Please update your payment method to restore full access.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!hasPro && plan.plan_type === "FREE" && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Upgrade to PRO</p>
                    <p className="text-sm text-muted-foreground">
                      Unlock all features including advanced tone variants, detailed digests, and more.
                    </p>
                  </div>
                  <Button
                    onClick={handleStartTrial}
                    disabled={trialLoading}
                    size="sm"
                    className="ml-4"
                  >
                    {trialLoading ? "Starting..." : "Start Free Trial"}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Access</CardTitle>
          <CardDescription>
            Features available on your current plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entitlements.map((entitlement) => (
              <div
                key={entitlement.feature}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {entitlement.enabled ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {entitlement.feature
                        .split("_")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </p>
                    {entitlement.limit !== null && (
                      <p className="text-xs text-muted-foreground">
                        Limit: {entitlement.limit}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant={entitlement.enabled ? "default" : "secondary"}
                >
                  {entitlement.enabled
                    ? entitlement.limit === null
                      ? "Unlimited"
                      : "Limited"
                    : "Not Available"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

