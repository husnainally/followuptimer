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
  LayoutDashboard,
  Users,
  Webhook,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  total_webhooks: number;
  failed_webhooks: number;
  total_jobs: number;
  failed_jobs: number;
  active_users: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      // Fetch webhook stats
      const webhooksResponse = await fetch("/api/admin/webhooks?limit=1");
      const webhooksData = await webhooksResponse.json();

      // Fetch failed webhooks
      const failedWebhooksResponse = await fetch(
        "/api/admin/webhooks?processed=false&limit=1"
      );
      const failedWebhooksData = await failedWebhooksResponse.json();

      // Fetch job stats
      const jobsResponse = await fetch("/api/admin/jobs?limit=1");
      const jobsData = await jobsResponse.json();

      // Fetch failed jobs
      const failedJobsResponse = await fetch(
        "/api/admin/jobs?status=failed&limit=1"
      );
      const failedJobsData = await failedJobsResponse.json();

      // Get active users count (users with activity in last 30 days)
      // For now, we'll use a placeholder - you can enhance this later
      const activeUsers = 0; // TODO: Implement active users query

      setStats({
        total_webhooks: webhooksData.pagination?.total || 0,
        failed_webhooks: failedWebhooksData.pagination?.total || 0,
        total_jobs: jobsData.pagination?.total || 0,
        failed_jobs: failedJobsData.pagination?.total || 0,
        active_users: activeUsers,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
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
    },
    {
      title: "Webhook Logs",
      description: "View Stripe webhook events",
      href: "/admin/webhooks",
      icon: Webhook,
    },
    {
      title: "Job Logs",
      description: "View digest job runs",
      href: "/admin/jobs",
      icon: Briefcase,
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
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
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview and quick access to admin tools
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold">
                {stats?.total_webhooks || 0}
              </div>
              <Webhook className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All time events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-destructive">
                {stats?.failed_webhooks || 0}
              </div>
              <AlertCircle className="w-4 h-4 text-destructive mb-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold">{stats?.total_jobs || 0}</div>
              <Briefcase className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Digest runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-destructive">
                {stats?.failed_jobs || 0}
              </div>
              <AlertCircle className="w-4 h-4 text-destructive mb-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Need investigation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold">
                {stats?.active_users || 0}
              </div>
              <Users className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
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
    </div>
  );
}

