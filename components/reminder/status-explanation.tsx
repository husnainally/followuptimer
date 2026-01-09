"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getSuppressionRuleName } from "@/lib/trust-audit";
import type { SuppressionDetail } from "@/lib/trust-audit";

interface StatusExplanationProps {
  status: string;
  remindAt: Date;
  suppressionDetails?: SuppressionDetail | null;
  snoozedUntil?: Date | null;
  suppressionTransparency?: "proactive" | "on_open";
}

export function StatusExplanation({
  status,
  remindAt,
  suppressionDetails,
  snoozedUntil,
  suppressionTransparency = "proactive",
}: StatusExplanationProps) {
  // For "on_open" mode, start collapsed; for "proactive" mode, start expanded
  const shouldStartExpanded = suppressionTransparency === "proactive" && status === "suppressed";
  const [isExpanded, setIsExpanded] = useState(shouldStartExpanded);

  const getStatusExplanation = () => {
    if (status === "suppressed" && suppressionDetails) {
      const intendedTime = new Date(suppressionDetails.intended_fire_time);
      const nextAttempt = suppressionDetails.next_attempt_time
        ? new Date(suppressionDetails.next_attempt_time)
        : null;

      return {
        title: "Reminder was held back",
        message: `This reminder didn't fire because it fell within your ${suppressionDetails.reason_human.toLowerCase()}.`,
        details: [
          {
            label: "Reason",
            value: suppressionDetails.reason_human,
          },
          {
            label: "Rule",
            value: getSuppressionRuleName(suppressionDetails.reason_code),
          },
          {
            label: "Intended fire time",
            value: format(intendedTime, "MMM d, yyyy 'at' h:mm a"),
          },
          ...(nextAttempt
            ? [
                {
                  label: "Next evaluation",
                  value: format(nextAttempt, "MMM d, yyyy 'at' h:mm a"),
                },
              ]
            : []),
        ],
      };
    }

    if (status === "snoozed" && snoozedUntil) {
      return {
        title: "Reminder was snoozed",
        message: `This reminder was snoozed until ${format(snoozedUntil, "EEEE, MMM d 'at' h:mm a")}.`,
        details: [
          {
            label: "Snoozed until",
            value: format(snoozedUntil, "MMM d, yyyy 'at' h:mm a"),
          },
        ],
      };
    }

    if (status === "completed") {
      return {
        title: "Reminder completed",
        message: "This reminder was completed successfully.",
        details: [],
      };
    }

    if (status === "pending") {
      const now = new Date();
      const isOverdue = remindAt < now;
      if (isOverdue) {
        return {
          title: "Reminder is overdue",
          message: `This reminder was scheduled for ${format(remindAt, "MMM d, yyyy 'at' h:mm a")} and is now overdue.`,
          details: [
            {
              label: "Scheduled for",
              value: format(remindAt, "MMM d, yyyy 'at' h:mm a"),
            },
          ],
        };
      }
      return {
        title: "Reminder is scheduled",
        message: `This reminder will fire on ${format(remindAt, "EEEE, MMM d 'at' h:mm a")}.`,
        details: [
          {
            label: "Scheduled for",
            value: format(remindAt, "MMM d, yyyy 'at' h:mm a"),
          },
        ],
      };
    }

    return null;
  };

  const explanation = getStatusExplanation();

  if (!explanation) {
    return null;
  }

  const detailsId = `status-details-${status}`;
  const buttonId = `status-toggle-${status}`;
  
  // For suppressed reminders in "on_open" mode, show collapsed with hint
  const isSuppressedOnOpen = status === "suppressed" && suppressionTransparency === "on_open";
  const showMessage = isExpanded || !isSuppressedOnOpen;

  return (
    <Card className="bg-muted/20 border-border/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm font-medium">What's happening?</CardTitle>
          </div>
          {explanation.details.length > 0 && (
            <Button
              id={buttonId}
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
              aria-label={isExpanded ? "Collapse details" : "Expand details"}
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {showMessage ? (
          <p className="text-sm text-foreground mb-3">{explanation.message}</p>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">
            Click to see why this reminder was suppressed.
          </p>
        )}
        {isExpanded && explanation.details.length > 0 && (
          <div
            id={detailsId}
            className="space-y-2 pt-3 border-t border-border/50"
            role="region"
            aria-labelledby={buttonId}
          >
            {explanation.details.map((detail, index) => (
              <div key={index} className="flex items-start justify-between gap-4">
                <span className="text-xs text-muted-foreground font-medium">
                  {detail.label}
                </span>
                <span className="text-xs text-foreground text-right">
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

