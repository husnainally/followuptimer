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
import { Download, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonViewer } from "@/components/admin/json-viewer";
import { format } from "date-fns";

interface WebhookLog {
  id: string;
  event_type: string;
  stripe_event_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  user_id: string | null;
  user_email: string | null;
  event_data: any;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export default function WebhookLogsPage() {
  const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [eventType, setEventType] = useState<string>("");
  const [processed, setProcessed] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");

  useEffect(() => {
    fetchWebhooks();
  }, [page, eventType, processed]);

  async function fetchWebhooks() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (eventType) params.append("event_type", eventType);
      if (processed !== "") params.append("processed", processed);
      if (customerId) params.append("customer_id", customerId);

      const response = await fetch(`/api/admin/webhooks?${params}`);
      const data = await response.json();

      if (data.success) {
        setWebhooks(data.webhooks || []);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
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
        "Event Type",
        "Stripe Event ID",
        "Customer ID",
        "User Email",
        "Processed",
        "Error",
        "Created At",
      ].join(","),
      ...webhooks.map((w) =>
        [
          w.event_type,
          w.stripe_event_id,
          w.stripe_customer_id || "",
          w.user_email || "",
          w.processed ? "Yes" : "No",
          w.error_message || "",
          new Date(w.created_at).toISOString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webhook-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Filter webhooks by search query
  const filteredWebhooks = webhooks.filter((w) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      w.stripe_event_id?.toLowerCase().includes(query) ||
      w.stripe_customer_id?.toLowerCase().includes(query) ||
      w.user_email?.toLowerCase().includes(query) ||
      w.event_type?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook Logs</h1>
          <p className="text-muted-foreground mt-1">
            View and troubleshoot Stripe webhook events
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All events</SelectItem>
                  <SelectItem value="customer.subscription.created">
                    Subscription Created
                  </SelectItem>
                  <SelectItem value="customer.subscription.updated">
                    Subscription Updated
                  </SelectItem>
                  <SelectItem value="customer.subscription.deleted">
                    Subscription Deleted
                  </SelectItem>
                  <SelectItem value="invoice.payment_failed">
                    Payment Failed
                  </SelectItem>
                  <SelectItem value="invoice.payment_succeeded">
                    Payment Succeeded
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={processed} onValueChange={setProcessed}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="true">Processed</SelectItem>
                  <SelectItem value="false">Not Processed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Event ID, Customer ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Customer ID</label>
              <Input
                placeholder="cus_..."
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchWebhooks();
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Events</CardTitle>
          <CardDescription>
            {filteredWebhooks.length} event{filteredWebhooks.length !== 1 ? "s" : ""} shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredWebhooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No webhook events found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWebhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleRow(webhook.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {expandedRows.has(webhook.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{webhook.event_type}</Badge>
                            <Badge
                              variant={
                                webhook.processed ? "default" : "destructive"
                              }
                            >
                              {webhook.processed ? "Processed" : "Failed"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium">Event ID:</span>{" "}
                              {webhook.stripe_event_id}
                            </p>
                            {webhook.user_email && webhook.user_id && (
                              <p>
                                <span className="font-medium">User:</span>{" "}
                                <Link
                                  href={`/admin/users/${webhook.user_id}`}
                                  className="text-primary hover:underline"
                                >
                                  {webhook.user_email}
                                </Link>
                              </p>
                            )}
                            {webhook.stripe_customer_id && (
                              <p>
                                <span className="font-medium">Customer:</span>{" "}
                                {webhook.stripe_customer_id}
                              </p>
                            )}
                            <p>
                              <span className="font-medium">Time:</span>{" "}
                              {format(
                                new Date(webhook.created_at),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </p>
                            {webhook.error_message && (
                              <p className="text-destructive">
                                <span className="font-medium">Error:</span>{" "}
                                {webhook.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {expandedRows.has(webhook.id) && (
                    <div className="border-t p-4 bg-muted/20">
                      <JsonViewer
                        data={webhook.event_data}
                        title="Event Data"
                        defaultExpanded={true}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredWebhooks.length > 0 && (
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

