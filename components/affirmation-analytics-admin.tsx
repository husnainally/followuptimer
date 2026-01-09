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
import { Sparkles, TrendingUp, Users, BarChart3, ArrowUpRight } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

interface AdminAffirmationAnalytics {
  enabled_users_pct: number;
  total_shown: number;
  total_suppressed: number;
  category_mix: Array<{ category: string; count: number; percentage: number }>;
  suppression_reasons: Array<{ reason: string; count: number; percentage: number }>;
  action_click_rate_with_affirmation: number | null;
  action_click_rate_without_affirmation: number | null;
  engagement_uplift: number | null;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function AffirmationAnalyticsAdmin() {
  const [analytics, setAnalytics] = useState<AdminAffirmationAnalytics | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/affirmations/admin?range=${range}`
      );
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Failed to fetch admin affirmation analytics:", error);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
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

  const categoryChartData = analytics.category_mix.map((cat) => ({
    name: formatCategoryName(cat.category),
    value: cat.count,
    percentage: cat.percentage,
  }));

  const suppressionChartData = analytics.suppression_reasons.map((reason) => ({
    name: formatReasonName(reason.reason),
    value: reason.count,
    percentage: reason.percentage,
  }));

  const showRate =
    analytics.total_shown + analytics.total_suppressed > 0
      ? Math.round(
          (analytics.total_shown /
            (analytics.total_shown + analytics.total_suppressed)) *
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
              Platform-wide affirmation performance and engagement
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Adoption
              </span>
            </div>
            <div className="text-3xl font-bold">
              {Math.round(analytics.enabled_users_pct * 100)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Users enabled
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Shown
              </span>
            </div>
            <div className="text-3xl font-bold">
              {analytics.total_shown.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {showRate}% show rate
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Suppressed
              </span>
            </div>
            <div className="text-3xl font-bold">
              {analytics.total_suppressed.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total suppressions
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Engagement Uplift
              </span>
            </div>
            <div className="text-3xl font-bold">
              {analytics.engagement_uplift !== null
                ? `${analytics.engagement_uplift > 0 ? "+" : ""}${analytics.engagement_uplift.toFixed(1)}%`
                : "N/A"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {analytics.action_click_rate_with_affirmation !== null &&
                analytics.action_click_rate_without_affirmation !== null && (
                  <>
                    {analytics.action_click_rate_with_affirmation.toFixed(1)}% vs{" "}
                    {analytics.action_click_rate_without_affirmation.toFixed(1)}%
                  </>
                )}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Mix Chart */}
          {categoryChartData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Category Distribution</h3>
              <ChartContainer
                config={categoryChartData.reduce((acc, item, index) => {
                  acc[item.name] = {
                    label: item.name,
                    color: COLORS[index % COLORS.length],
                  };
                  return acc;
                }, {} as Record<string, { label: string; color: string }>)}
              >
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-medium">
                                  {data.name}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-muted-foreground">
                                  Count
                                </span>
                                <span className="text-sm font-bold">
                                  {data.value}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-muted-foreground">
                                  Percentage
                                </span>
                                <span className="text-sm font-bold">
                                  {data.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ChartContainer>
            </div>
          )}

          {/* Suppression Reasons Chart */}
          {suppressionChartData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Suppression Reasons</h3>
              <ChartContainer
                config={suppressionChartData.reduce((acc, item, index) => {
                  acc[item.name] = {
                    label: item.name,
                    color: COLORS[index % COLORS.length],
                  };
                  return acc;
                }, {} as Record<string, { label: string; color: string }>)}
              >
                <BarChart data={suppressionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-medium">
                                  {data.name}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-muted-foreground">
                                  Count
                                </span>
                                <span className="text-sm font-bold">
                                  {data.value}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-muted-foreground">
                                  Percentage
                                </span>
                                <span className="text-sm font-bold">
                                  {data.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </div>

        {/* Engagement Comparison */}
        {analytics.action_click_rate_with_affirmation !== null &&
          analytics.action_click_rate_without_affirmation !== null && (
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Action Click Rate Comparison
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    With Affirmation
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {analytics.action_click_rate_with_affirmation.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Without Affirmation
                  </div>
                  <div className="text-2xl font-bold">
                    {analytics.action_click_rate_without_affirmation.toFixed(1)}%
                  </div>
                </div>
              </div>
              {analytics.engagement_uplift !== null && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight
                      className={`w-4 h-4 ${
                        analytics.engagement_uplift > 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {analytics.engagement_uplift > 0
                        ? "Positive"
                        : "Negative"}{" "}
                      engagement impact: {analytics.engagement_uplift.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
