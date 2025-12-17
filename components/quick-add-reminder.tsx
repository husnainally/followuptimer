"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface QuickAddReminderProps {
  onReminderCreated?: () => void;
}

export function QuickAddReminder({ onReminderCreated }: QuickAddReminderProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error("Please enter a reminder message");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Creating reminder...");

    try {
      // Set reminder for 1 hour from now by default
      const remindAt = new Date();
      remindAt.setHours(remindAt.getHours() + 1);

      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          remind_at: remindAt.toISOString(),
          tone: "motivational",
          notification_method: "email",
          affirmation_enabled: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to create reminder");
      }

      toast.success("Reminder created successfully", { id: toastId });
      setMessage("");
      
      if (onReminderCreated) {
        onReminderCreated();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to create reminder", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Quick add reminder (e.g., Follow up with John tomorrow)"
              className="pr-10 bg-white border-border"
              disabled={isLoading}
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {isLoading ? "Adding..." : "Add"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 ml-1">
          Reminder will be set for 1 hour from now. Edit it later to customize.
        </p>
      </CardContent>
    </Card>
  );
}

