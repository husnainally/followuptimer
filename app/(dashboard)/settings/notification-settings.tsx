"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ControlledSwitch } from "@/components/controlled-switch";
import { Check, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Skeleton } from "@/components/ui/skeleton";

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  reminderAlerts: z.boolean().default(true),
  weeklyDigest: z.boolean().default(false),
  digestPreferences: z.object({
    enabled: z.boolean(),
    day_of_week: z.number().min(0).max(6),
    time: z.string(),
    format: z.string(),
  }).optional(),
  affirmationFrequency: z.enum(['rare', 'balanced', 'frequent']).default('balanced'),
  smartSnooze: z.boolean().default(false),
});

export function NotificationSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const pushSubscription = usePushSubscription();

  const form = useForm({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      reminderAlerts: true,
      weeklyDigest: false,
      digestPreferences: {
        enabled: false,
        day_of_week: 1,
        time: "09:00",
        format: "html",
      },
      affirmationFrequency: 'balanced',
      smartSnooze: false,
    },
  });

  useEffect(() => {
    loadNotificationSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNotificationSettings() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "email_notifications, push_notifications, reminder_before_minutes, affirmation_frequency, smart_snooze_enabled, digest_preferences"
          )
          .eq("id", user.id)
          .single();

        if (profile) {
          const digestPrefs = (profile.digest_preferences as Record<string, unknown>) || {};
          form.reset({
            emailNotifications: profile.email_notifications ?? true,
            pushNotifications: profile.push_notifications ?? false,
            reminderAlerts: true,
            weeklyDigest: digestPrefs.enabled === true,
            digestPreferences: {
              enabled: digestPrefs.enabled === true,
              day_of_week: (digestPrefs.day_of_week as number) ?? 1,
              time: (digestPrefs.time as string) ?? "09:00",
              format: (digestPrefs.format as string) ?? "html",
            },
            affirmationFrequency: (profile.affirmation_frequency || 'balanced') as 'rare' | 'balanced' | 'frequent',
            smartSnooze: profile.smart_snooze_enabled ?? false,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: z.infer<typeof notificationSettingsSchema>) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Update notification preferences
      const digestPrefs = data.weeklyDigest
        ? {
            enabled: true,
            day_of_week: data.digestPreferences?.day_of_week ?? 1,
            time: data.digestPreferences?.time ?? "09:00",
            format: data.digestPreferences?.format ?? "html",
          }
        : { enabled: false, day_of_week: 1, time: "09:00", format: "html" };

      const { error } = await supabase
        .from("profiles")
        .update({
          email_notifications: data.emailNotifications,
          push_notifications: data.pushNotifications,
          affirmation_frequency: data.affirmationFrequency,
          smart_snooze_enabled: data.smartSnooze,
          digest_preferences: digestPrefs,
        })
        .eq("id", user.id);

      if (error) throw error;

      // If push notifications are enabled and supported, try to subscribe
      if (
        data.pushNotifications &&
        pushSubscription.isSupported &&
        !pushSubscription.isSubscribed
      ) {
        const subscribed = await pushSubscription.subscribe();
        if (!subscribed) {
          toast.warning(
            "Push notifications enabled, but browser subscription failed. Please click 'Enable Browser Push Notifications' button."
          );
        }
      } else if (!data.pushNotifications && pushSubscription.isSubscribed) {
        // If disabled, unsubscribe
        await pushSubscription.unsubscribe();
      }

      setSaveSuccess(true);
      toast.success("Notification settings updated");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast.error("Failed to save settings");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between border border-dashed border-border/40 rounded-xl p-4">
              <div className="space-y-2 w-full">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
          <div className="flex justify-end">
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="">
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ControlledSwitch
              control={form.control}
              name="emailNotifications"
              label="Email Notifications"
              description="Receive affirmation reminders via email"
            />
            <div className="space-y-2">
              <ControlledSwitch
                control={form.control}
                name="pushNotifications"
                label="Push Notifications"
                description="Receive push notifications on your devices"
              />
              {pushSubscription.isSupported && (
                <div className="ml-6 space-y-2">
                  {!pushSubscription.isSubscribed &&
                    pushSubscription.permission !== "denied" && (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={pushSubscription.subscribe}
                          disabled={pushSubscription.isLoading}
                        >
                          {pushSubscription.isLoading
                            ? "Enabling..."
                            : "Enable Browser Push Notifications"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          ⚠️ You must click this button to enable browser push
                          notifications, even if the toggle above is ON.
                        </p>
                      </div>
                    )}
                  {pushSubscription.isSubscribed && (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={pushSubscription.unsubscribe}
                        disabled={pushSubscription.isLoading}
                      >
                        {pushSubscription.isLoading
                          ? "Disabling..."
                          : "Disable Browser Push Notifications"}
                      </Button>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ✓ Browser push subscription is active
                      </p>
                    </div>
                  )}
                  {pushSubscription.permission === "denied" && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        Push notifications are blocked. Please enable them in
                        your browser settings.
                      </span>
                    </div>
                  )}
                </div>
              )}
              {!pushSubscription.isSupported && (
                <p className="ml-6 text-xs text-muted-foreground">
                  Push notifications are not supported in this browser
                </p>
              )}
            </div>
            <ControlledSwitch
              control={form.control}
              name="reminderAlerts"
              label="Reminder Alerts"
              description="Get alerted when a reminder is due"
            />
            <div className="space-y-2">
              <ControlledSwitch
                control={form.control}
                name="weeklyDigest"
                label="Weekly Digest"
                description="Receive a weekly summary of your activity"
              />
              {form.watch("weeklyDigest") && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="digest-day">Day of Week</Label>
                  <Select
                    id="digest-day"
                    defaultValue="1"
                    onValueChange={(value) => {
                      const prefs = form.getValues("digestPreferences") || {};
                      form.setValue("digestPreferences", {
                        ...prefs,
                        day_of_week: parseInt(value),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="affirmation-frequency">Affirmation Frequency</Label>
              <Select
                value={form.watch("affirmationFrequency")}
                onValueChange={(value) => form.setValue("affirmationFrequency", value as 'rare' | 'balanced' | 'frequent')}
              >
                <SelectTrigger id="affirmation-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rare">Rare - Once per day</SelectItem>
                  <SelectItem value="balanced">Balanced - Every 4 hours</SelectItem>
                  <SelectItem value="frequent">Frequent - Every hour</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often affirmations appear in your dashboard
              </p>
            </div>
            <ControlledSwitch
              control={form.control}
              name="smartSnooze"
              label="Smart Snooze"
              description="Get intelligent snooze duration suggestions based on your patterns"
            />
            <div className="flex justify-end pt-4">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm text-primary mr-4">
                  <Check className="w-4 h-4" />
                  <span>Saved successfully</span>
                </div>
              )}
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Save Preferences
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
