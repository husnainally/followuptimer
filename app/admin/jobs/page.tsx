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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Search, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonViewer } from "@/components/admin/json-viewer";
import { format } from "date-fns";

interface JobLog {
  id: string;
  user_id: string;
  user_email: string | null;
  week_start_date: string;
  week_end_date: string;
  digest_variant: string;
  status: string;
  retry_count: number;
  last_retry_at: string | null;
  failure_reason: string | null;
  stats_data: any;
  sent_at: string | null;
  created_at: string;
  dedupe_key: string | null;
}

export default function JobLogsPage() {
  const [jobs, setJobs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [status, setStatus] = useState<string>("");
  const [variant, setVariant] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchJobs();
  }, [page, status, variant]);

  async function fetchJobs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (status) params.append("status", status);
      if (variant) params.append("variant", variant);

      const response = await fetch(`/api/admin/jobs?${params}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs || []);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(id: string) {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  }

  function exportToCSV() {
    const csv = [
      [
        "User Email",
        "Week Start",
        "Week End",
        "Variant",
        "Status",
        "Retry Count",
        "Failure Reason",
        "Sent At",
        "Created At",
      ].join(","),
      ...jobs.map((j) =>
        [
          j.user_email || "",
          j.week_start_date,
          j.week_end_date,
          j.digest_variant,
          j.status,
          j.retry_count,
          j.failure_reason || "",
          j.sent_at || "",
          new Date(j.created_at).toISOString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Filter jobs by search query
  const filteredJobs = jobs.filter((j) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return j.user_email?.toLowerCase().includes(query) || false;
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case "sent":
        return <Badge variant="default">Sent</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "skipped":
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getVariantBadge(variant: string) {
    const colors: Record<string, "default" | "secondary" | "outline"> = {
      standard: "default",
      light: "secondary",
      recovery: "outline",
      no_activity: "outline",
    };
    return (
      <Badge variant={colors[variant] || "outline"}>
        {variant || "standard"}
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Logs</h1>
          <p className="text-muted-foreground mt-1">
            View and troubleshoot digest job runs
          </p>
        </div>
        <Button onClick={exportToCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Variant</label>
              <Select value={variant} onValueChange={setVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="All variants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All variants</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                  <SelectItem value="no_activity">No Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="User email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Digest Jobs</CardTitle>
          <CardDescription>
            {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""} shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No jobs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map((job) => (
                <div key={job.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleRow(job.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {expandedRows.has(job.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(job.status)}
                            {getVariantBadge(job.digest_variant)}
                            {job.retry_count > 0 && (
                              <Badge variant="outline">
                                {job.retry_count} retry{job.retry_count !== 1 ? "ies" : ""}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {job.user_email && job.user_id && (
                              <p>
                                <span className="font-medium">User:</span>{" "}
                                <Link
                                  href={`/admin/users/${job.user_id}`}
                                  className="text-primary hover:underline"
                                >
                                  {job.user_email}
                                </Link>
                              </p>
                            )}
                            <p>
                              <span className="font-medium">Week:</span>{" "}
                              {format(new Date(job.week_start_date), "MMM d")} -{" "}
                              {format(new Date(job.week_end_date), "MMM d, yyyy")}
                            </p>
                            {job.sent_at && (
                              <p>
                                <span className="font-medium">Sent:</span>{" "}
                                {format(
                                  new Date(job.sent_at),
                                  "MMM d, yyyy 'at' h:mm a"
                                )}
                              </p>
                            )}
                            <p>
                              <span className="font-medium">Created:</span>{" "}
                              {format(
                                new Date(job.created_at),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </p>
                            {job.failure_reason && (
                              <p className="text-destructive">
                                <span className="font-medium">Error:</span>{" "}
                                {job.failure_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {expandedRows.has(job.id) && (
                    <div className="border-t p-4 bg-muted/20">
                      <JsonViewer
                        data={job.stats_data}
                        title="Stats Data"
                        defaultExpanded={true}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredJobs.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

