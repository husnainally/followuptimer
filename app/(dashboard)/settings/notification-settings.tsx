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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/use-push-subscription";

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  reminderAlerts: z.boolean().default(true),
  weeklyDigest: z.boolean().default(false),
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
            "email_notifications, push_notifications, reminder_before_minutes"
          )
          .eq("id", user.id)
          .single();

        if (profile) {
          form.reset({
            emailNotifications: profile.email_notifications ?? true,
            pushNotifications: profile.push_notifications ?? false,
            reminderAlerts: true,
            weeklyDigest: false,
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
      const { error } = await supabase
        .from("profiles")
        .update({
          email_notifications: data.emailNotifications,
          push_notifications: data.pushNotifications,
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
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading...</div>
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
            <ControlledSwitch
              control={form.control}
              name="weeklyDigest"
              label="Weekly Digest"
              description="Receive a weekly summary of your activity"
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
