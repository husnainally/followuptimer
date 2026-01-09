"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Reminder } from "@/app/(dashboard)/reminders-table";

interface SwipeableReminderCardProps {
  reminder: Reminder;
  onReminderClick?: (reminder: Reminder) => void;
  onDeleteClick?: (reminder: Reminder, event: React.MouseEvent) => void;
  onComplete?: (reminderId: string) => Promise<void>;
  onSnooze?: (reminderId: string) => Promise<void>;
  toneBadgeClassMap: Record<string, string>;
  statusBadgeClassMap: Record<string, string>;
  formatDate: (date: Date) => string;
}

const SWIPE_THRESHOLD = 100; // Minimum distance to trigger swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity for quick swipe

export function SwipeableReminderCard({
  reminder,
  onReminderClick,
  onDeleteClick,
  onComplete,
  onSnooze,
  toneBadgeClassMap,
  statusBadgeClassMap,
  formatDate,
}: SwipeableReminderCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [actionType, setActionType] = useState<"complete" | "snooze" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);

  // Reset swipe on status change
  useEffect(() => {
    if (reminder.status === "completed" || reminder.status === "sent") {
      setSwipeOffset(0);
      setIsSwiping(false);
      setActionType(null);
    }
  }, [reminder.status]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't allow swipe on completed/sent reminders
    if (reminder.status === "completed" || reminder.status === "sent") {
      return;
    }

    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    currentXRef.current = touch.clientX;
    startTimeRef.current = Date.now();
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || reminder.status === "completed" || reminder.status === "sent") {
      return;
    }

    const touch = e.touches[0];
    currentXRef.current = touch.clientX;
    const deltaX = currentXRef.current - startXRef.current;

    // Determine action type based on swipe direction
    if (deltaX < -50) {
      setActionType("complete");
    } else if (deltaX > 50) {
      setActionType("snooze");
    } else {
      setActionType(null);
    }

    // Limit swipe distance
    const maxSwipe = 150;
    const clampedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
    setSwipeOffset(clampedDelta);
  };

  const handleTouchEnd = async () => {
    if (!isSwiping || reminder.status === "completed" || reminder.status === "sent") {
      setIsSwiping(false);
      setSwipeOffset(0);
      setActionType(null);
      return;
    }

    const deltaX = currentXRef.current - startXRef.current;
    const deltaTime = Date.now() - startTimeRef.current;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Check if swipe meets threshold
    const meetsDistanceThreshold = Math.abs(deltaX) >= SWIPE_THRESHOLD;
    const meetsVelocityThreshold = velocity >= SWIPE_VELOCITY_THRESHOLD;

    if (meetsDistanceThreshold || meetsVelocityThreshold) {
      setIsProcessing(true);
      try {
        if (deltaX < 0 && actionType === "complete" && onComplete) {
          // Swipe left = complete
          await onComplete(reminder.id);
        } else if (deltaX > 0 && actionType === "snooze" && onSnooze) {
          // Swipe right = snooze
          await onSnooze(reminder.id);
        }
      } catch (error) {
        console.error("Failed to process swipe action:", error);
        toast.error("Failed to process action");
      } finally {
        setIsProcessing(false);
      }
    }

    // Reset swipe state
    setIsSwiping(false);
    setSwipeOffset(0);
    setActionType(null);
  };

  const canSwipe = reminder.status !== "completed" && reminder.status !== "sent";

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Action Background Indicators */}
      {canSwipe && (
        <>
          {/* Complete indicator (left) */}
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-32 flex items-center justify-start pl-6 transition-opacity duration-200",
              actionType === "complete" && swipeOffset < -50
                ? "opacity-100"
                : "opacity-0"
            )}
            style={{
              background: "linear-gradient(to right, rgb(34, 197, 94), transparent)",
            }}
          >
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>

          {/* Snooze indicator (right) */}
          <div
            className={cn(
              "absolute right-0 top-0 h-full w-32 flex items-center justify-end pr-6 transition-opacity duration-200",
              actionType === "snooze" && swipeOffset > 50
                ? "opacity-100"
                : "opacity-0"
            )}
            style={{
              background: "linear-gradient(to left, rgb(59, 130, 246), transparent)",
            }}
          >
            <Clock className="h-8 w-8 text-white" />
          </div>
        </>
      )}

      {/* Card Content */}
      <div
        className={cn(
          "rounded-3xl border border-border/60 bg-card p-5 space-y-4 shadow-sm transition-transform duration-200 touch-none",
          isProcessing && "opacity-50"
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
      >
        <div className="space-y-2">
          <p className="text-base font-semibold text-foreground line-clamp-3">
            {reminder.message}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-primary"></span>
            {formatDate(reminder.remind_at)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Badge
            className={cn(
              "capitalize border-0 px-3 py-1 text-xs font-medium",
              toneBadgeClassMap[reminder.tone] ?? "bg-muted/60 text-foreground"
            )}
          >
            {reminder.tone}
          </Badge>
          <Badge
            className={cn(
              "capitalize border-0 px-3 py-1 text-xs font-medium",
              statusBadgeClassMap[reminder.status] ?? "bg-muted/60 text-foreground"
            )}
          >
            {reminder.status}
          </Badge>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onReminderClick?.(reminder)}
            className="rounded-full bg-muted/30 hover:bg-muted/50"
            aria-label="Edit reminder"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => onDeleteClick?.(reminder, event)}
            className="rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
            aria-label="Delete reminder"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
