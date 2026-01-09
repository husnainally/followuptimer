"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Clock, BarChart3 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

interface UserAffirmationAnalytics {
  shown_count: number;
  suppressed_count: number;
  top_categories: Array<{ category: string; count: number }>;
  last_shown_at: string | null;
  suppression_reasons: Array<{ reason: string; count: number }>;
  current_daily_count: number;
  daily_cap: number;
  cooldown_remaining_minutes: number | null;
}

export function AffirmationAnalyticsUser() {
  const [analytics, setAnalytics] = useState<UserAffirmationAnalytics | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/affirmations/user?range=${range}`
      );
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Failed to fetch affirmation analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatCategoryName(category: string): string {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function formatReasonName(reason: string): string {
    return reason
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  const categoryChartData = analytics.top_categories.map((cat) => ({
    category: formatCategoryName(cat.category),
    count: cat.count,
  }));

  const showRate =
    analytics.shown_count + analytics.suppressed_count > 0
      ? Math.round(
          (analytics.shown_count /
            (analytics.shown_count + analytics.suppressed_count)) *
            100
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Affirmation Analytics
            </CardTitle>
            <CardDescription>
              Your personal affirmation usage and insights
            </CardDescription>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Shown
              </span>
            </div>
            <div className="text-3xl font-bold">{analytics.shown_count}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {showRate}% show rate
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Today
              </span>
            </div>
            <div className="text-3xl font-bold">
              {analytics.current_daily_count}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              of {analytics.daily_cap} daily cap
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Suppressed
              </span>
            </div>
            <div className="text-3xl font-bold">
              {analytics.suppressed_count}
            </div>
            {analytics.cooldown_remaining_minutes !== null &&
              analytics.cooldown_remaining_minutes > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Cooldown: {analytics.cooldown_remaining_minutes}m left
                </div>
              )}
          </div>
        </div>

        {/* Top Categories Chart */}
        {categoryChartData.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Top Categories</h3>
            <ChartContainer
              config={{
                count: {
                  label: "Count",
                  color: "hsl(var(--chart-1))",
                },
              }}
            >
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {/* Suppression Reasons */}
        {analytics.suppression_reasons.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Suppression Reasons</h3>
            <div className="space-y-2">
              {analytics.suppression_reasons.map((reason) => (
                <div
                  key={reason.reason}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm">
                    {formatReasonName(reason.reason)}
                  </span>
                  <Badge variant="outline">{reason.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Shown */}
        {analytics.last_shown_at && (
          <div className="text-sm text-muted-foreground">
            Last shown:{" "}
            {new Date(analytics.last_shown_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
