"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getEventDisplayInfo,
  formatAuditTimestamp,
  type ReminderAuditEvent,
} from "@/lib/trust-audit";

interface AuditTimelineProps {
  reminderId: string;
}

export function AuditTimeline({ reminderId }: AuditTimelineProps) {
  const [events, setEvents] = useState<ReminderAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimeline();
  }, [reminderId]);

  async function fetchTimeline() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/reminders/${reminderId}/audit`);
      if (!response.ok) throw new Error("Failed to fetch audit timeline");

      const data = await response.json();
      // Reverse to show chronological order (oldest first)
      setEvents((data.timeline || []).reverse());
    } catch (err) {
      console.error("Failed to fetch audit timeline:", err);
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No history available for this reminder yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {events.map((event, index) => {
              const displayInfo = getEventDisplayInfo(event.event_type);
              const isLast = index === events.length - 1;

              return (
                <div key={event.id} className="relative flex items-start gap-3">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-4 top-8 w-0.5 h-full bg-border" />
                  )}

                  {/* Event icon */}
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted border-2 border-background">
                    <span className="text-sm">{displayInfo.icon}</span>
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {displayInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {displayInfo.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatAuditTimestamp(event.created_at)}
                    </p>

                    {/* Suppression details */}
                    {event.event_type === "reminder_suppressed" &&
                      event.event_data && (
                        <div className="mt-2 p-2 rounded-md bg-muted/50 text-xs">
                          <p className="text-muted-foreground">
                            Reason:{" "}
                            {String(
                              (event.event_data as Record<string, unknown>)
                                .reason_code || "Unknown"
                            )}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

