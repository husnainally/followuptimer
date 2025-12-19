"use client";

import * as React from "react";
import { X, Check, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SnoozeSuggestions } from "@/components/ui/snooze-suggestions";
import { cn } from "@/lib/utils";

export type PopupTemplateType = "success" | "streak" | "inactivity" | "follow_up_required";

export interface PopupProps {
  id: string;
  templateType: PopupTemplateType;
  title: string;
  message: string;
  affirmation?: string;
  onFollowUpNow?: () => void;
  onSnooze?: (minutes: number, scheduledTime?: string) => void;
  onSnoozeWithTime?: (scheduledTime: Date) => void;
  snoozeOptions?: Array<{ label: string; minutes: number }>;
  snoozeCandidates?: Array<{
    type: string;
    scheduledTime: string;
    label: string;
    score: number;
    recommended?: boolean;
    adjusted: boolean;
  }>;
  onMarkDone?: () => void;
  onDismiss?: () => void;
  isLoading?: boolean;
  className?: string;
}

const templateStyles = {
  success: {
    borderColor: "border-green-500/50",
    bgGradient: "from-green-50 to-white dark:from-green-950/20 dark:to-card",
    icon: Check,
    iconColor: "text-green-600 dark:text-green-400",
  },
  streak: {
    borderColor: "border-yellow-500/50",
    bgGradient: "from-yellow-50 to-white dark:from-yellow-950/20 dark:to-card",
    icon: Check,
    iconColor: "text-yellow-600 dark:text-yellow-400",
  },
  inactivity: {
    borderColor: "border-blue-500/50",
    bgGradient: "from-blue-50 to-white dark:from-blue-950/20 dark:to-card",
    icon: Clock,
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  follow_up_required: {
    borderColor: "border-orange-500/50",
    bgGradient: "from-orange-50 to-white dark:from-orange-950/20 dark:to-card",
    icon: ArrowRight,
    iconColor: "text-orange-600 dark:text-orange-400",
  },
};

export function Popup({
  id: _id,
  templateType,
  title,
  message,
  affirmation,
  onFollowUpNow,
  onSnooze,
  snoozeOptions,
  onMarkDone,
  onDismiss,
  isLoading,
  className,
}: PopupProps) {
  const styles = templateStyles[templateType];
  const Icon = styles.icon;

  return (
    <Card
      className={cn(
        "relative w-full max-w-md border-2 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300",
        styles.borderColor,
        styles.bgGradient,
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-full p-2 bg-background",
                styles.iconColor
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={onDismiss}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        {affirmation && (
          <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
            <p className="text-sm font-medium italic text-foreground">
              {affirmation}
            </p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {onFollowUpNow && (
            <Button
              size="sm"
              onClick={onFollowUpNow}
              className="bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Follow up now
            </Button>
          )}
          {onSnooze && snoozeCandidates && snoozeCandidates.length > 0 ? (
            <SnoozeSuggestions
              candidates={snoozeCandidates}
              onSelect={(candidate) => {
                if (candidate.type === "pick_a_time") {
                  // This will be handled by SnoozeSuggestions component
                  return;
                }
                // Calculate minutes from now to scheduled time
                const scheduledTime = new Date(candidate.scheduledTime);
                const now = new Date();
                const minutes = Math.round(
                  (scheduledTime.getTime() - now.getTime()) / (1000 * 60)
                );
                onSnooze(minutes, candidate.scheduledTime);
              }}
              onPickTime={(time) => {
                if (onSnoozeWithTime) {
                  onSnoozeWithTime(time);
                } else {
                  // Fallback: calculate minutes
                  const now = new Date();
                  const minutes = Math.round(
                    (time.getTime() - now.getTime()) / (1000 * 60)
                  );
                  onSnooze(minutes, time.toISOString());
                }
              }}
              isLoading={isLoading}
            />
          ) : (
            onSnooze &&
            (snoozeOptions?.length
              ? snoozeOptions
              : [{ label: "Snooze 1h", minutes: 60 }]
            ).map((opt) => (
              <Button
                key={opt.label}
                size="sm"
                variant="outline"
                onClick={() => onSnooze(opt.minutes)}
                disabled={isLoading}
              >
                <Clock className="h-4 w-4 mr-2" />
                {opt.label}
              </Button>
            ))
          )}
          {onMarkDone && (
            <Button size="sm" variant="outline" onClick={onMarkDone} disabled={isLoading}>
              <Check className="h-4 w-4 mr-2" />
              Mark done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

