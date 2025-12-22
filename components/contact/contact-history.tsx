"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Clock, CheckCircle2, Bell, Pause } from "lucide-react";

interface ContactHistoryEvent {
  id: string;
  event_type: string;
  created_at: string;
  reminder_id?: string;
  reminder?: {
    message: string;
    status: string;
  };
}

interface ContactHistoryProps {
  contactId: string;
}

export function ContactHistory({ contactId }: ContactHistoryProps) {
  const [events, setEvents] = useState<ContactHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [contactId]);

  async function fetchHistory() {
    try {
      setLoading(true);
      const response = await fetch(`/api/contacts/${contactId}/history`);
      if (!response.ok) return;

      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Failed to fetch contact history:", err);
    } finally {
      setLoading(false);
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "reminder_completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "reminder_snoozed":
        return <Pause className="h-4 w-4 text-blue-600" />;
      case "reminder_created":
        return <Bell className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case "reminder_completed":
        return "Reminder completed";
      case "reminder_snoozed":
        return "Reminder snoozed";
      case "reminder_created":
        return "Reminder created";
      default:
        return eventType.replace("_", " ");
    }
  };

  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
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

  if (events.length === 0) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent activity for this contact.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {getEventLabel(event.event_type)}
                  </p>
                  {event.reminder && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {event.reminder.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

