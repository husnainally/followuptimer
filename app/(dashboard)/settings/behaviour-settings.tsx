"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const behaviourSettingsSchema = z.object({
  defaultSnoozeMinutes: z.number().min(5).max(1440),
  defaultFollowupIntervalDays: z.number().min(1).max(365),
  autoCreateFollowup: z.boolean(),
  overdueHandling: z.enum(["gentle_nudge", "escalation", "none"]),
  suppressionTransparency: z.enum(["proactive", "on_open"]),
});

type BehaviourSettingsFormData = z.infer<typeof behaviourSettingsSchema>;

const snoozeOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
];

export function BehaviourSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customSnooze, setCustomSnooze] = useState(false);

  const form = useForm<BehaviourSettingsFormData>({
    resolver: zodResolver(behaviourSettingsSchema),
    defaultValues: {
      defaultSnoozeMinutes: 30,
      defaultFollowupIntervalDays: 3,
      autoCreateFollowup: false,
      overdueHandling: "gentle_nudge",
      suppressionTransparency: "proactive",
    },
  });

  useEffect(() => {
    loadBehaviourSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBehaviourSettings() {
    try {
      const response = await fetch("/api/preferences");
      if (!response.ok) {
        throw new Error("Failed to load preferences");
      }

      const data = await response.json();
      if (data.preferences) {
        const prefs = data.preferences;
        const snoozeValue = prefs.default_snooze_minutes || 30;
        const isCustom = !snoozeOptions.find((opt) => opt.value === snoozeValue);
        setCustomSnooze(isCustom);

        form.reset({
          defaultSnoozeMinutes: snoozeValue,
          defaultFollowupIntervalDays: prefs.default_followup_interval_days || 3,
          autoCreateFollowup: prefs.auto_create_followup || false,
          overdueHandling: prefs.overdue_handling || "gentle_nudge",
          suppressionTransparency: prefs.suppression_transparency || "proactive",
        });
      }
    } catch (error) {
      console.error("Failed to load behaviour settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveBehaviourSettings(data: BehaviourSettingsFormData) {
    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          default_snooze_minutes: data.defaultSnoozeMinutes,
          default_followup_interval_days: data.defaultFollowupIntervalDays,
          auto_create_followup: data.autoCreateFollowup,
          overdue_handling: data.overdueHandling,
          suppression_transparency: data.suppressionTransparency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      setSaveSuccess(true);
      toast.success("Behaviour settings saved successfully");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save behaviour settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save behaviour settings"
      );
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder Behaviour</CardTitle>
        <CardDescription>
          Configure default behaviors and automation settings for reminders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(saveBehaviourSettings)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="defaultSnoozeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Snooze Duration</FormLabel>
                  {!customSnooze ? (
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setCustomSnooze(true);
                        } else {
                          field.onChange(parseInt(value, 10));
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {snoozeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        min={5}
                        max={1440}
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 30)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomSnooze(false);
                          field.onChange(30);
                        }}
                      >
                        Use preset
                      </Button>
                    </div>
                  )}
                  <FormDescription>
                    Default duration when you snooze a reminder without specifying a time
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultFollowupIntervalDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Follow-up Interval</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        className="w-24"
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 3)}
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Default number of days between follow-up reminders
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoCreateFollowup"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Auto-Create Follow-up Prompt
                    </FormLabel>
                    <FormDescription>
                      Prompt to create next follow-up after completing a reminder
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="overdueHandling"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overdue Reminder Display</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select handling" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gentle_nudge">Gentle Nudge - Subtle indicator</SelectItem>
                      <SelectItem value="escalation">Escalation - Highlighted badge</SelectItem>
                      <SelectItem value="none">None - No special display</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How overdue reminders are displayed in the dashboard
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="suppressionTransparency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suppression Transparency</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transparency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="proactive">Proactive - Show reasons in list</SelectItem>
                      <SelectItem value="on_open">On Open - Show only when reminder opened</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    When to show why a reminder was suppressed (quiet hours, daily cap, etc.)
                  </FormDescription>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={saveSuccess}>
              {saveSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

