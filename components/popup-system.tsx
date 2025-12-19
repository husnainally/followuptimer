"use client";

import { useEffect, useState } from "react";
import { Popup, type PopupTemplateType } from "@/components/ui/popup";
import { toast } from "sonner";

interface PopupData {
  id: string;
  template_type: PopupTemplateType;
  title: string;
  message: string;
  affirmation?: string;
  reminder_id?: string;
  contact_id?: string;
  action_data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

interface SnoozeCandidate {
  type: string;
  scheduledTime: string;
  label: string;
  score: number;
  recommended?: boolean;
  adjusted: boolean;
}

export function PopupSystem() {
  const [currentPopup, setCurrentPopup] = useState<PopupData | null>(null);
  const [snoozeCandidates, setSnoozeCandidates] = useState<SnoozeCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uiState, setUiState] = useState<"entering" | "visible" | "exiting">("entering");

  useEffect(() => {
    fetchNextPopup();
    // Poll for new popups every 30 seconds
    const interval = setInterval(fetchNextPopup, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNextPopup() {
    try {
      const response = await fetch("/api/popups");
      if (!response.ok) return;

      const data = await response.json();
      if (data.popup && ["queued", "pending", "displayed", "shown"].includes(data.popup.status)) {
        setCurrentPopup(data.popup);
        setUiState("entering");
        // let the browser paint, then settle to visible for smooth transitions
        requestAnimationFrame(() => setUiState("visible"));

        // Fetch snooze suggestions if reminder_id exists
        if (data.popup.reminder_id) {
          fetchSnoozeSuggestions(data.popup.reminder_id, data.popup.payload);
        } else {
          setSnoozeCandidates([]);
        }
      }
    } catch (error) {
      // Silently fail - popups are non-critical
      console.error("Failed to fetch popup:", error);
    }
  }

  async function fetchSnoozeSuggestions(
    reminderId: string,
    payload?: Record<string, unknown>
  ) {
    try {
      const eventType = payload?.source_event_type as string | undefined;
      const url = new URL("/api/snooze/suggestions", window.location.origin);
      url.searchParams.set("reminder_id", reminderId);
      if (eventType) {
        url.searchParams.set("event_type", eventType);
      }

      const response = await fetch(url.toString());
      if (!response.ok) return;

      const data = await response.json();
      if (data.candidates && Array.isArray(data.candidates)) {
        setSnoozeCandidates(data.candidates);
      }
    } catch (error) {
      // Silently fail - suggestions are non-critical
      console.error("Failed to fetch snooze suggestions:", error);
      setSnoozeCandidates([]);
    }
  }

  async function handleAction(
    popupId: string,
    actionType: "FOLLOW_UP_NOW" | "SNOOZE" | "MARK_DONE",
    actionData?: Record<string, unknown>,
    snoozeUntil?: string
  ) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/popups/${popupId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: actionType,
          action_data: actionData || {},
          snooze_until: snoozeUntil,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If popup already processed (409), just close it gracefully
        if (response.status === 409) {
          toast.info("Action already completed");
          setUiState("exiting");
          setTimeout(() => {
            setCurrentPopup(null);
            fetchNextPopup();
          }, 220);
          return;
        }
        throw new Error(errorData.error || "Failed to handle action");
      }

      const result = await response.json().catch(() => ({}));
      if (actionType === "FOLLOW_UP_NOW") {
        const url = result?.action_url as string | null | undefined;
        if (url && typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        } else if (currentPopup?.reminder_id) {
          window.location.href = `/reminder/${currentPopup.reminder_id}`;
        } else if (currentPopup?.contact_id) {
          window.location.href = `/contacts/${currentPopup.contact_id}`;
        } else {
          window.location.href = `/dashboard`;
        }
      }

      toast.success("Done");
      setUiState("exiting");
      setTimeout(() => {
        setCurrentPopup(null);
        fetchNextPopup();
      }, 220);
    } catch (error) {
      toast.error("Failed to complete action");
      console.error("Failed to handle popup action:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDismiss(popupId: string) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/popups/${popupId}/dismiss`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to dismiss popup");
      }

      setUiState("exiting");
      setTimeout(() => {
        setCurrentPopup(null);
        fetchNextPopup();
      }, 220);
    } catch (error) {
      toast.error("Failed to dismiss popup");
      console.error("Failed to dismiss popup:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!currentPopup) return null;

  const snoozeOptions = [
    { label: "Snooze 1h", minutes: 60 },
    { label: "Tomorrow", minutes: 60 * 24 },
    { label: "Next week", minutes: 60 * 24 * 7 },
  ];

  // Don't show snooze for reminder_completed popups (reminder already sent)
  const sourceEventType = (currentPopup.payload as Record<string, unknown>)?.source_event_type as string | undefined;
  const isReminderCompleted = sourceEventType === "reminder_completed";
  const canSnooze = currentPopup.reminder_id && !isReminderCompleted;

  return (
    <div
      className={[
        "fixed bottom-4 right-4 z-50",
        "transition-all duration-200 ease-out motion-reduce:transition-none",
        uiState === "entering" ? "opacity-0 translate-y-2" : "",
        uiState === "visible" ? "opacity-100 translate-y-0" : "",
        uiState === "exiting" ? "opacity-0 translate-y-2" : "",
      ].join(" ")}
    >
      <Popup
        id={currentPopup.id}
        templateType={currentPopup.template_type}
        title={currentPopup.title}
        message={currentPopup.message}
        affirmation={currentPopup.affirmation}
        isLoading={isLoading}
        onFollowUpNow={() =>
          handleAction(currentPopup.id, "FOLLOW_UP_NOW", {
            ...(currentPopup.action_data || {}),
            ...(currentPopup.payload || {}),
          })
        }
        onSnooze={
          canSnooze
            ? (minutes, scheduledTime) => {
                // Find the candidate that matches
                const candidate = snoozeCandidates.find(
                  (c) => c.scheduledTime === scheduledTime || 
                  (scheduledTime && new Date(c.scheduledTime).getTime() === new Date(scheduledTime).getTime())
                );
                handleAction(
                  currentPopup.id,
                  "SNOOZE",
                  {
                    minutes,
                    reminder_id: currentPopup.reminder_id,
                    scheduled_time: scheduledTime,
                    candidate_type: candidate?.type,
                    was_recommended: candidate?.recommended || false,
                  },
                  scheduledTime || new Date(Date.now() + minutes * 60 * 1000).toISOString()
                );
              }
            : undefined
        }
        onSnoozeWithTime={
          canSnooze
            ? (scheduledTime) =>
                handleAction(
                  currentPopup.id,
                  "SNOOZE",
                  {
                    reminder_id: currentPopup.reminder_id,
                    scheduled_time: scheduledTime.toISOString(),
                    candidate_type: "pick_a_time",
                    was_recommended: false,
                  },
                  scheduledTime.toISOString()
                )
            : undefined
        }
        snoozeOptions={canSnooze && snoozeCandidates.length === 0 ? snoozeOptions : undefined}
        snoozeCandidates={canSnooze && snoozeCandidates.length > 0 ? snoozeCandidates : undefined}
        onMarkDone={
          currentPopup.reminder_id
            ? () =>
                handleAction(
                  currentPopup.id,
                  "MARK_DONE",
                  { reminder_id: currentPopup.reminder_id },
                  undefined
                )
            : () => handleAction(currentPopup.id, "MARK_DONE", currentPopup.action_data)
        }
        onDismiss={() => handleDismiss(currentPopup.id)}
      />
    </div>
  );
}

