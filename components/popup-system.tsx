"use client";

import { useEffect, useState, useRef } from "react";
import { Popup, type PopupTemplateType } from "@/components/ui/popup";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  const [snoozeCandidates, setSnoozeCandidates] = useState<SnoozeCandidate[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [uiState, setUiState] = useState<"entering" | "visible" | "exiting">(
    "entering"
  );
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentPopupRef = useRef<PopupData | null>(null);

  // Track if we've already played sound for this popup to avoid duplicates
  const [playedSoundForPopup, setPlayedSoundForPopup] = useState<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    currentPopupRef.current = currentPopup;
  }, [currentPopup]);

  // Play ping sound when popup appears
  useEffect(() => {
    if (currentPopup && uiState === "entering" && playedSoundForPopup !== currentPopup.id) {
      playPingSound();
      setPlayedSoundForPopup(currentPopup.id);
    }
    // Reset when popup is dismissed
    if (!currentPopup) {
      setPlayedSoundForPopup(null);
    }
  }, [currentPopup, uiState, playedSoundForPopup]);

  // Initialize user and set up Realtime subscription
  useEffect(() => {
    async function initializeRealtime() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // User not authenticated, fallback to polling
          setRealtimeConnected(false);
          return;
        }

        setUserId(user.id);

        // Set up Realtime subscription
        const channel = supabase
          .channel("popups-realtime")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "popups",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              // New popup created - fetch immediately
              console.log("New popup detected via Realtime:", payload.new);
              fetchNextPopup();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "popups",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              // Popup updated - refresh if it's the current popup
              const updatedPopup = payload.new as Record<string, unknown>;
              const current = currentPopupRef.current;
              if (current?.id === updatedPopup.id) {
                // Current popup was updated (e.g., dismissed, acted upon)
                // If status changed to dismissed/acted/expired, close it
                const status = updatedPopup.status as string;
                if (
                  ["dismissed", "acted", "expired"].includes(status) &&
                  current
                ) {
                  setUiState("exiting");
                  setTimeout(() => {
                    setCurrentPopup(null);
                    fetchNextPopup();
                  }, 220);
                } else {
                  // Just refresh the popup data
                  fetchNextPopup();
                }
              } else if (
                updatedPopup.status === "queued" ||
                updatedPopup.status === "pending"
              ) {
                // Another popup became available
                if (!current) {
                  fetchNextPopup();
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setRealtimeConnected(true);
              console.log("Realtime subscription active");
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setRealtimeConnected(false);
              console.warn("Realtime subscription failed, falling back to polling");
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error("Failed to initialize Realtime:", error);
        setRealtimeConnected(false);
      }
    }

    initializeRealtime();

    return () => {
      // Clean up Realtime subscription
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Polling fallback - only used when Realtime is not connected
  useEffect(() => {
    // Initial fetch
    fetchNextPopup();

    // If Realtime is connected, use minimal polling (30s) as backup
    // If Realtime is not connected, use more frequent polling (8s visible, 30s hidden)
    let interval: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - reduce polling frequency
        clearInterval(interval);
        interval = setInterval(fetchNextPopup, 30000); // 30 seconds when hidden
      } else {
        // Tab is visible
        clearInterval(interval);
        fetchNextPopup(); // Check immediately when tab becomes visible
        if (realtimeConnected) {
          // Realtime connected - use minimal polling as backup (30s)
          interval = setInterval(fetchNextPopup, 30000);
        } else {
          // Realtime not connected - use frequent polling (8s)
          interval = setInterval(fetchNextPopup, 8000);
        }
      }
    };

    // Set initial interval based on visibility and Realtime status
    if (document.hidden) {
      interval = setInterval(fetchNextPopup, 30000);
    } else {
      fetchNextPopup(); // Initial fetch
      if (realtimeConnected) {
        interval = setInterval(fetchNextPopup, 30000);
      } else {
        interval = setInterval(fetchNextPopup, 8000);
      }
    }

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [realtimeConnected]);

  function playPingSound() {
    try {
      // Check if AudioContext is available
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return; // Audio not supported
      }

      // Create audio context (may need user interaction first due to autoplay policies)
      const audioContext = new AudioContextClass();
      
      // Resume audio context if suspended (required for autoplay policies)
      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {
          // Silently fail if user interaction is required
          return;
        });
      }
      
      // Create oscillator for the ping sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure ping sound: pleasant notification tone
      // Start at 800Hz, drop to 600Hz for a pleasant "ping" sound
      oscillator.type = "sine"; // Smooth sine wave
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);
      
      // Volume envelope: quick attack, smooth decay
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.02); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2); // Smooth decay
      
      // Play the sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.25); // Stop after 250ms
      
      // Clean up
      oscillator.onended = () => {
        audioContext.close().catch(() => {
          // Ignore cleanup errors
        });
      };
    } catch (error) {
      // Silently fail if audio context is not available (e.g., autoplay restrictions)
      // This is non-critical functionality
    }
  }

  async function fetchNextPopup() {
    try {
      const response = await fetch("/api/popups");
      if (!response.ok) return;

      const data = await response.json();
      if (
        data.popup &&
        ["queued", "pending", "displayed", "shown"].includes(data.popup.status)
      ) {
        setCurrentPopup(data.popup);
        setUiState("entering");
        // let the browser paint, then settle to visible for smooth transitions
        requestAnimationFrame(() => setUiState("visible"));

        // Fetch snooze suggestions if reminder_id exists and smart suggestions enabled
        if (data.popup.reminder_id) {
          // Check if smart suggestions are enabled before fetching
          fetchSnoozeSuggestions(
            data.popup.reminder_id,
            data.popup.payload
          ).catch(() => {
            // If fetch fails (e.g., smart suggestions disabled), use empty candidates
            setSnoozeCandidates([]);
          });
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
      if (!response.ok) {
        // If 404 or smart suggestions disabled, return empty
        setSnoozeCandidates([]);
        return;
      }

      const data = await response.json();
      if (
        data.candidates &&
        Array.isArray(data.candidates) &&
        data.candidates.length > 0
      ) {
        setSnoozeCandidates(data.candidates);

        // Log suggestion_shown event
        try {
          await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "suggestion_shown",
              event_data: {
                reminder_id: reminderId,
                candidates_count: data.candidates.length,
                recommended_type: data.candidates.find(
                  (c: { recommended?: boolean }) => c.recommended
                )?.type,
                context_type: eventType || "unknown",
              },
            }),
          });
        } catch (e) {
          // Fail silently - analytics is non-critical
        }
      } else {
        setSnoozeCandidates([]);
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

      // Dispatch custom event to trigger refreshes after snooze
      // The reminder detail page already listens to this event and will update accordingly
      if (
        actionType === "SNOOZE" &&
        currentPopup?.reminder_id &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(
          new CustomEvent("reminder-updated", {
            detail: { reminderId: currentPopup.reminder_id },
          })
        );
        // No need to reload - the reminder detail page listens to this event
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
  const sourceEventType = (currentPopup.payload as Record<string, unknown>)
    ?.source_event_type as string | undefined;
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
                  (c) =>
                    c.scheduledTime === scheduledTime ||
                    (scheduledTime &&
                      new Date(c.scheduledTime).getTime() ===
                        new Date(scheduledTime).getTime())
                );

                // Log suggestion_clicked event if candidate found
                if (candidate) {
                  fetch("/api/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      event_type: "suggestion_clicked",
                      event_data: {
                        reminder_id: currentPopup.reminder_id,
                        suggestion_type: candidate.type,
                        scheduled_time: candidate.scheduledTime,
                        was_recommended: candidate.recommended || false,
                      },
                    }),
                  }).catch(() => {
                    // Fail silently - analytics is non-critical
                  });
                }

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
                  scheduledTime ||
                    new Date(Date.now() + minutes * 60 * 1000).toISOString()
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
        snoozeOptions={
          canSnooze && snoozeCandidates.length === 0 ? snoozeOptions : undefined
        }
        snoozeCandidates={
          canSnooze && snoozeCandidates.length > 0
            ? snoozeCandidates
            : undefined
        }
        onMarkDone={
          currentPopup.reminder_id
            ? () =>
                handleAction(
                  currentPopup.id,
                  "MARK_DONE",
                  { reminder_id: currentPopup.reminder_id },
                  undefined
                )
            : () =>
                handleAction(
                  currentPopup.id,
                  "MARK_DONE",
                  currentPopup.action_data
                )
        }
        onDismiss={() => handleDismiss(currentPopup.id)}
      />
    </div>
  );
}
