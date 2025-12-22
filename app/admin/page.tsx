"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  Users,
  Webhook,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Bell,
  Mail,
  TrendingUp,
  Activity,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { UserSearch } from "@/components/admin/user-search";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface AdminStats {
  overview: {
    total_users: number;
    active_users: number;
    total_reminders: number;
    completed_reminders: number;
    total_contacts: number;
    waitlist_count: number;
    completion_rate: number;
  };
  plans: {
    distribution: Record<string, number>;
    free: number;
    pro: number;
    team: number;
  };
  webhooks: {
    total: number;
    failed: number;
    success_rate: number;
    by_type: Record<string, number>;
  };
  jobs: {
    total: number;
    failed: number;
    success_rate: number;
    status_distribution: Record<string, number>;
  };
  charts: {
    daily_signups: Array<{ date: string; count: number }>;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    fetchStats();
  }, [range]);

  async function fetchStats() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/stats?range=${range}`);
      const data = await response.json();

      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
    }
  }

  const quickLinks = [
    {
      title: "Waitlist",
      description: "Manage waitlist entries",
      href: "/admin/waitlist",
      icon: Users,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Webhook Logs",
      description: "View Stripe webhook events",
      href: "/admin/webhooks",
      icon: Webhook,
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Job Logs",
      description: "View digest job runs",
      href: "/admin/jobs",
      icon: Briefcase,
      color: "bg-green-500/10 text-green-600",
    },
  ];

  // Prepare chart data
  const signupChartData = stats?.charts.daily_signups.map((item) => ({
    date: format(new Date(item.date), "MMM d"),
    signups: item.count,
  })) || [];

  const webhookTypeData = stats?.webhooks.by_type
    ? Object.entries(stats.webhooks.by_type).map(([type, count]) => ({
        type: type.replace("customer.subscription.", "").replace("invoice.", ""),
        count,
      }))
    : [];

  const planDistributionData = stats?.plans.distribution
    ? [
        { plan: "FREE", count: stats.plans.free },
        { plan: "PRO", count: stats.plans.pro },
        { plan: "TEAM", count: stats.plans.team },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive platform overview and analytics
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.overview.total_users.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.overview.active_users || 0} active in range
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.overview.total_reminders.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {stats?.overview.completion_rate || 0}% complete
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.webhooks.total.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={stats?.webhooks.success_rate === 100 ? "default" : "destructive"}
              >
                {stats?.webhooks.success_rate || 100}% success
              </Badge>
              {stats?.webhooks.failed > 0 && (
                <span className="text-xs text-destructive">
                  {stats.webhooks.failed} failed
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.jobs.total.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={stats?.jobs.success_rate === 100 ? "default" : "destructive"}
              >
                {stats?.jobs.success_rate || 100}% success
              </Badge>
              {stats?.jobs.failed > 0 && (
                <span className="text-xs text-destructive">
                  {stats.jobs.failed} failed
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Signups Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Daily Signups (Last 30 Days)
            </CardTitle>
            <CardDescription>
              New user registrations over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signupChartData.length > 0 ? (
              <ChartContainer
                config={{
                  signups: {
                    label: "Signups",
                    color: "hsl(var(--chart-1))",
                  },
                }}
              >
                <AreaChart data={signupChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No signup data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Plan Distribution
            </CardTitle>
            <CardDescription>
              Users by subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planDistributionData.length > 0 ? (
              <ChartContainer
                config={{
                  FREE: {
                    label: "FREE",
                    color: "hsl(var(--muted))",
                  },
                  PRO: {
                    label: "PRO",
                    color: "hsl(var(--primary))",
                  },
                  TEAM: {
                    label: "TEAM",
                    color: "hsl(var(--chart-2))",
                  },
                }}
              >
                <BarChart data={planDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No plan data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">FREE</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {stats?.plans.free || 0}
                </span>
                <Badge variant="outline">
                  {stats?.overview.total_users
                    ? Math.round(
                        ((stats.plans.free || 0) / stats.overview.total_users) *
                          100
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">PRO</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {stats?.plans.pro || 0}
                </span>
                <Badge variant="default">
                  {stats?.overview.total_users
                    ? Math.round(
                        ((stats.plans.pro || 0) / stats.overview.total_users) *
                          100
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">TEAM</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {stats?.plans.team || 0}
                </span>
                <Badge variant="secondary">
                  {stats?.overview.total_users
                    ? Math.round(
                        ((stats.plans.team || 0) / stats.overview.total_users) *
                          100
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Webhook Success</span>
              <div className="flex items-center gap-2">
                {stats?.webhooks.success_rate === 100 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                <span className="text-lg font-semibold">
                  {stats?.webhooks.success_rate || 100}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Job Success</span>
              <div className="flex items-center gap-2">
                {stats?.jobs.success_rate === 100 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                <span className="text-lg font-semibold">
                  {stats?.jobs.success_rate || 100}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reminder Completion</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {stats?.overview.completion_rate || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Contacts</span>
              <span className="text-lg font-semibold">
                {stats?.overview.total_contacts.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Waitlist</span>
              <span className="text-lg font-semibold">
                {stats?.overview.waitlist_count.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed Reminders</span>
              <span className="text-lg font-semibold">
                {stats?.overview.completed_reminders.toLocaleString() || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:bg-muted/50 transition-all hover:shadow-md cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${link.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{link.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {link.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Charts and User Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webhook Events by Type Chart */}
        {webhookTypeData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Webhook Events by Type (Last 30 Days)
              </CardTitle>
              <CardDescription>
                Distribution of Stripe webhook event types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: {
                    label: "Count",
                    color: "hsl(var(--chart-3))",
                  },
                }}
              >
                <BarChart data={webhookTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* User Search */}
        <UserSearch />
      </div>
    </div>
  );
}
