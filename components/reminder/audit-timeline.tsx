"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  getEventDisplayInfo,
  formatAuditTimestamp,
  type ReminderAuditEvent,
} from "@/lib/trust-audit";

interface AuditTimelineProps {
  reminderId: string;
}

const INITIAL_LIMIT = 20;
const LOAD_MORE_LIMIT = 20;

export function AuditTimeline({ reminderId }: AuditTimelineProps) {
  const [events, setEvents] = useState<ReminderAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const fetchTimeline = useCallback(async (currentOffset: number = 0, isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const response = await fetch(
        `/api/reminders/${reminderId}/audit?limit=${INITIAL_LIMIT}&offset=${currentOffset}`
      );
      if (!response.ok) throw new Error("Failed to fetch audit timeline");

      const data = await response.json();
      const newEvents = data.timeline || [];
      
      if (isInitial) {
        // Reverse to show chronological order (oldest first)
        setEvents(newEvents.reverse());
        setOffset(newEvents.length);
      } else {
        // Append new events (already in reverse chronological order from API)
        setEvents((prev) => [...prev, ...newEvents.reverse()]);
        setOffset((prev) => prev + newEvents.length);
      }
      
      setHasMore(data.pagination?.hasMore || false);
    } catch (err) {
      console.error("Failed to fetch audit timeline:", err);
      setError("Failed to load history");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [reminderId]);

  useEffect(() => {
    fetchTimeline(0, true);
  }, [fetchTimeline]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchTimeline(offset, false);
    }
  }, [loadingMore, hasMore, offset, fetchTimeline]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    
    // Load more when within 100px of bottom
    if (scrollBottom < 100 && hasMore && !loadingMore) {
      handleLoadMore();
    }
  }, [hasMore, loadingMore, handleLoadMore]);

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
        <CardTitle className="text-base" id="audit-timeline-title">
          History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea
          ref={scrollAreaRef}
          className="h-[400px] pr-4"
          onScrollCapture={handleScroll}
        >
          <div
            role="list"
            aria-labelledby="audit-timeline-title"
            className="space-y-4"
          >
            {events.map((event, index) => {
              const displayInfo = getEventDisplayInfo(event.event_type);
              const isLast = index === events.length - 1;
              const eventId = `audit-event-${event.id}`;
              const iconId = `audit-icon-${event.id}`;
              const descriptionId = `audit-description-${event.id}`;

              return (
                <div
                  key={event.id}
                  role="listitem"
                  className="relative flex items-start gap-3"
                  aria-labelledby={eventId}
                >
                  {/* Timeline line */}
                  {!isLast && (
                    <div
                      className="absolute left-4 top-8 w-0.5 h-full bg-border"
                      aria-hidden="true"
                    />
                  )}

                  {/* Event icon */}
                  <div
                    id={iconId}
                    className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted border-2 border-background"
                    aria-hidden="true"
                  >
                    <span className="text-sm" aria-label={displayInfo.label}>
                      {displayInfo.icon}
                    </span>
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        id={eventId}
                        className="text-sm font-medium text-foreground"
                      >
                        {displayInfo.label}
                      </span>
                    </div>
                    <p
                      id={descriptionId}
                      className="text-xs text-muted-foreground mb-1"
                      aria-describedby={iconId}
                    >
                      {displayInfo.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={event.created_at}>
                        {formatAuditTimestamp(event.created_at)}
                      </time>
                    </p>

                    {/* Suppression details */}
                    {event.event_type === "reminder_suppressed" &&
                      event.event_data && (
                        <div
                          className="mt-2 p-2 rounded-md bg-muted/50 text-xs"
                          role="region"
                          aria-label="Suppression details"
                        >
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
          
          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                aria-label="Load more history events"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
          
          {loadingMore && (
            <div className="flex justify-center pt-2 pb-4" role="status" aria-live="polite">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

