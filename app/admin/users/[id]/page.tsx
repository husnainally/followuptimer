"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, CreditCard, Settings, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonViewer } from "@/components/admin/json-viewer";
import { format } from "date-fns";

interface UserPlanData {
  user: {
    id: string;
    email: string | null;
  };
  plan: {
    plan_type: string;
    subscription_status: string;
    plan_started_at: string | null;
    trial_ends_at: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    stripe_product_id: string | null;
  };
  entitlements: Array<{
    feature: string;
    enabled: boolean;
    limit: number | null;
  }>;
  recent_webhooks: any[];
  recent_jobs: any[];
}

export default function UserPlanViewerPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const [data, setData] = useState<UserPlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserPlan();
    }
  }, [userId]);

  async function fetchUserPlan() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/plan`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        console.error("Failed to fetch user plan:", result.error);
      }
    } catch (error) {
      console.error("Failed to fetch user plan:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Active" },
      trialing: { variant: "secondary", label: "Trialing" },
      past_due: { variant: "destructive", label: "Past Due" },
      canceled: { variant: "outline", label: "Canceled" },
      paused: { variant: "outline", label: "Paused" },
      none: { variant: "outline", label: "None" },
    };

    const badge = badges[status] || { variant: "outline" as const, label: status };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  }

  function getPlanBadge(planType: string) {
    const badges: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      PRO: { variant: "default", label: "PRO" },
      TEAM: { variant: "secondary", label: "TEAM" },
      FREE: { variant: "outline", label: "FREE" },
    };

    const badge = badges[planType] || { variant: "outline" as const, label: planType };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">User Plan Details</h1>
          <p className="text-muted-foreground mt-1">
            {data.user.email || `User ${data.user.id}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Plan Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan Type</span>
              {getPlanBadge(data.plan.plan_type)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Subscription Status</span>
              {getStatusBadge(data.plan.subscription_status)}
            </div>
            {data.plan.plan_started_at && (
              <div>
                <span className="text-sm font-medium">Plan Started</span>
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(data.plan.plan_started_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>
            )}
            {data.plan.trial_ends_at && (
              <div>
                <span className="text-sm font-medium">Trial Ends</span>
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(data.plan.trial_ends_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>
            )}
            {data.plan.stripe_customer_id && (
              <div>
                <span className="text-sm font-medium">Stripe Customer ID</span>
                <p className="text-sm text-muted-foreground font-mono">
                  {data.plan.stripe_customer_id}
                </p>
              </div>
            )}
            {data.plan.stripe_subscription_id && (
              <div>
                <span className="text-sm font-medium">Stripe Subscription ID</span>
                <p className="text-sm text-muted-foreground font-mono">
                  {data.plan.stripe_subscription_id}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Entitlements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Feature Entitlements
            </CardTitle>
            <CardDescription>
              What features this user has access to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.entitlements.map((entitlement) => (
                <div
                  key={entitlement.feature}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div className="flex items-center gap-2">
                    {entitlement.enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {entitlement.feature.replace(/_/g, " ")}
                    </span>
                  </div>
                  {entitlement.enabled && entitlement.limit !== null && (
                    <Badge variant="outline">Limit: {entitlement.limit}</Badge>
                  )}
                  {!entitlement.enabled && (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Webhook Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Webhook Events</CardTitle>
          <CardDescription>
            Last 10 Stripe webhook events for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhook events found</p>
          ) : (
            <div className="space-y-2">
              {data.recent_webhooks.map((webhook: any) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{webhook.event_type}</Badge>
                      <Badge
                        variant={webhook.processed ? "default" : "destructive"}
                      >
                        {webhook.processed ? "Processed" : "Failed"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {webhook.stripe_event_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(webhook.created_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Digest Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Digest Jobs</CardTitle>
          <CardDescription>
            Last 10 digest job runs for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No digest jobs found</p>
          ) : (
            <div className="space-y-2">
              {data.recent_jobs.map((job: any) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          job.status === "sent"
                            ? "default"
                            : job.status === "failed"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {job.status}
                      </Badge>
                      <Badge variant="outline">{job.digest_variant}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Week: {format(new Date(job.week_start_date), "MMM d")} -{" "}
                      {format(new Date(job.week_end_date), "MMM d, yyyy")}
                    </p>
                    {job.sent_at && (
                      <p className="text-xs text-muted-foreground">
                        Sent:{" "}
                        {format(new Date(job.sent_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                    {job.failure_reason && (
                      <p className="text-xs text-destructive">
                        Error: {job.failure_reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

