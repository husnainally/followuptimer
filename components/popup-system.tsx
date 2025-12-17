"use client";

import { useEffect, useState } from "react";
import { Popup, type PopupTemplateType } from "@/components/ui/popup";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface PopupData {
  id: string;
  template_type: PopupTemplateType;
  title: string;
  message: string;
  affirmation?: string;
  reminder_id?: string;
  action_data?: Record<string, unknown>;
}

export function PopupSystem() {
  const [currentPopup, setCurrentPopup] = useState<PopupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      if (data.popup && data.popup.status === "pending") {
        setCurrentPopup(data.popup);
        // Mark as shown
        await markPopupAsShown(data.popup.id);
      }
    } catch (error) {
      // Silently fail - popups are non-critical
      console.error("Failed to fetch popup:", error);
    }
  }

  async function markPopupAsShown(popupId: string) {
    try {
      const supabase = createClient();
      await supabase
        .from("popups")
        .update({
          status: "shown",
          shown_at: new Date().toISOString(),
        })
        .eq("id", popupId);
    } catch (error) {
      console.error("Failed to mark popup as shown:", error);
    }
  }

  async function handleAction(
    popupId: string,
    actionType: "complete" | "snooze" | "follow_up",
    actionData?: Record<string, unknown>
  ) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/popups/${popupId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: actionType,
          action_data: actionData || {},
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to handle action");
      }

      toast.success("Action completed");
      setCurrentPopup(null);
      // Fetch next popup after a short delay
      setTimeout(fetchNextPopup, 1000);
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

      setCurrentPopup(null);
      // Fetch next popup after a short delay
      setTimeout(fetchNextPopup, 1000);
    } catch (error) {
      toast.error("Failed to dismiss popup");
      console.error("Failed to dismiss popup:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!currentPopup) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
      <Popup
        id={currentPopup.id}
        templateType={currentPopup.template_type}
        title={currentPopup.title}
        message={currentPopup.message}
        affirmation={currentPopup.affirmation}
        onComplete={
          currentPopup.template_type === "success" ||
          currentPopup.template_type === "follow_up_required"
            ? () =>
                handleAction(
                  currentPopup.id,
                  "complete",
                  currentPopup.action_data
                )
            : undefined
        }
        onSnooze={
          currentPopup.reminder_id
            ? () =>
                handleAction(currentPopup.id, "snooze", {
                  minutes: 10,
                  reminder_id: currentPopup.reminder_id,
                })
            : undefined
        }
        onFollowUp={
          currentPopup.template_type === "follow_up_required"
            ? () =>
                handleAction(
                  currentPopup.id,
                  "follow_up",
                  currentPopup.action_data
                )
            : undefined
        }
        onDismiss={() => handleDismiss(currentPopup.id)}
      />
    </div>
  );
}

