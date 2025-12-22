"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const digestSettingsSchema = z.object({
  weeklyDigestEnabled: z.boolean(),
  digestDay: z.number().min(0).max(6),
  digestTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
  digestChannel: z.enum(["email", "in_app", "both"]),
  digestDetailLevel: z.enum(["light", "standard"]),
  onlyWhenActive: z.boolean(),
});

type DigestSettingsFormData = z.infer<typeof digestSettingsSchema>;

const dayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function DigestSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<DigestSettingsFormData>({
    resolver: zodResolver(digestSettingsSchema),
    defaultValues: {
      weeklyDigestEnabled: false,
      digestDay: 1, // Monday
      digestTime: "08:00",
      digestChannel: "email",
      digestDetailLevel: "standard",
      onlyWhenActive: false,
    },
  });

  useEffect(() => {
    loadDigestSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDigestSettings() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: preferences } = await supabase
          .from("user_digest_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (preferences) {
          // Convert time from "HH:mm:ss" to "HH:mm"
          const timeStr = preferences.digest_time || "08:00:00";
          const timeParts = timeStr.split(":");
          const timeFormatted = `${timeParts[0]}:${timeParts[1]}`;

          form.reset({
            weeklyDigestEnabled: preferences.weekly_digest_enabled ?? false,
            digestDay: preferences.digest_day ?? 1,
            digestTime: timeFormatted,
            digestChannel: preferences.digest_channel ?? "email",
            digestDetailLevel: preferences.digest_detail_level ?? "standard",
            onlyWhenActive: preferences.only_when_active ?? false,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load digest settings:", error);
      toast.error("Failed to load digest settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveDigestSettings(data: DigestSettingsFormData) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to save settings");
        return;
      }

      // Convert time from "HH:mm" to "HH:mm:ss"
      const timeWithSeconds = `${data.digestTime}:00`;

      const response = await fetch("/api/digests/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekly_digest_enabled: data.weeklyDigestEnabled,
          digest_day: data.digestDay,
          digest_time: timeWithSeconds,
          digest_channel: data.digestChannel,
          digest_detail_level: data.digestDetailLevel,
          only_when_active: data.onlyWhenActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      setSaveSuccess(true);
      toast.success("Digest settings saved successfully");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save digest settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save digest settings"
      );
    }
  }

  // Use useWatch to avoid calling form.watch() in render
  const weeklyDigestEnabled = useWatch({
    control: form.control,
    name: "weeklyDigestEnabled",
    defaultValue: false,
  });

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
        <CardTitle>Weekly Digest Settings</CardTitle>
        <CardDescription>
          Configure when and how you receive your weekly follow-up summary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(saveDigestSettings)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="weeklyDigestEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Enable Weekly Digest
                    </FormLabel>
                    <FormDescription>
                      Receive a weekly summary of your follow-up activity
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className={weeklyDigestEnabled ? "block space-y-6" : "hidden"}>
              <FormField
                control={form.control}
                name="digestDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select
                      value={String(field.value ?? 1)}
                      onValueChange={(value) =>
                        field.onChange(parseInt(value, 10))
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dayOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Day of the week to receive your digest
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="digestTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription>
                      Time of day (in your local timezone)
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="digestChannel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Channel</FormLabel>
                    <Select
                      value={field.value ?? "email"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="in_app">In-App Only</SelectItem>
                        <SelectItem value="both">
                          Both Email & In-App
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How you want to receive your digest
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="digestDetailLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detail Level</FormLabel>
                    <Select
                      value={field.value ?? "standard"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="light">Light (Minimal)</SelectItem>
                        <SelectItem value="standard">
                          Standard (Full Details)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Light shows only key metrics, Standard includes
                      per-contact breakdown
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="onlyWhenActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Only Send When Active
                      </FormLabel>
                      <FormDescription>
                        Only send digest if there was activity during the week
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
