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
import { Form, FormField } from "@/components/ui/form";
import { ControlledSwitch } from "@/components/controlled-switch";
import { Check, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const snoozeSettingsSchema = z.object({
  workingHoursStart: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  workingHoursEnd: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  workingDays: z.array(z.number().min(0).max(6)).min(1),
  quietHoursStart: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .nullable(),
  quietHoursEnd: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .nullable(),
  maxRemindersPerDay: z.number().min(1).max(100).default(10),
  allowWeekends: z.boolean().default(false),
  laterToday: z.boolean().default(true),
  tomorrowMorning: z.boolean().default(true),
  nextWorkingDay: z.boolean().default(true),
  in3Days: z.boolean().default(true),
  nextWeek: z.boolean().default(true),
  pickATime: z.boolean().default(true),
  followUpCadence: z
    .enum(["fast", "balanced", "light_touch"])
    .default("balanced"),
  smartSuggestionsEnabled: z.boolean().default(true),
});

type SnoozeSettingsFormData = z.infer<typeof snoozeSettingsSchema>;

const dayLabels = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function SnoozeSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<SnoozeSettingsFormData>({
    resolver: zodResolver(snoozeSettingsSchema),
    defaultValues: {
      workingHoursStart: "09:00",
      workingHoursEnd: "17:30",
      workingDays: [1, 2, 3, 4, 5],
      quietHoursStart: null,
      quietHoursEnd: null,
      maxRemindersPerDay: 10,
      allowWeekends: false,
      laterToday: true,
      tomorrowMorning: true,
      nextWorkingDay: true,
      in3Days: true,
      nextWeek: true,
      pickATime: true,
      followUpCadence: "balanced",
      smartSuggestionsEnabled: true,
    },
  });

  useEffect(() => {
    loadSnoozeSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSnoozeSettings() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const response = await fetch("/api/snooze/preferences");
        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            const prefs = data.preferences;
            form.reset({
              workingHoursStart:
                prefs.working_hours_start?.slice(0, 5) || "09:00",
              workingHoursEnd: prefs.working_hours_end?.slice(0, 5) || "17:30",
              workingDays: prefs.working_days || [1, 2, 3, 4, 5],
              quietHoursStart: prefs.quiet_hours_start?.slice(0, 5) || null,
              quietHoursEnd: prefs.quiet_hours_end?.slice(0, 5) || null,
              maxRemindersPerDay: prefs.max_reminders_per_day || 10,
              allowWeekends: prefs.allow_weekends ?? false,
              laterToday: prefs.default_snooze_options?.later_today ?? true,
              tomorrowMorning:
                prefs.default_snooze_options?.tomorrow_morning ?? true,
              nextWorkingDay:
                prefs.default_snooze_options?.next_working_day ?? true,
              in3Days: prefs.default_snooze_options?.in_3_days ?? true,
              nextWeek: prefs.default_snooze_options?.next_week ?? true,
              pickATime: prefs.default_snooze_options?.pick_a_time ?? true,
              followUpCadence: prefs.follow_up_cadence || "balanced",
              smartSuggestionsEnabled: prefs.smart_suggestions_enabled ?? true,
            });
          }
        } else {
          // If 404 or other error, use defaults (preferences will be created on first save)
          console.log("No preferences found, using defaults");
        }
      }
    } catch (error) {
      console.error("Failed to load snooze settings:", error);
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: SnoozeSettingsFormData) {
    try {
      const response = await fetch("/api/snooze/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          working_hours_start: `${data.workingHoursStart}:00`,
          working_hours_end: `${data.workingHoursEnd}:00`,
          working_days: data.workingDays,
          quiet_hours_start: data.quietHoursStart
            ? `${data.quietHoursStart}:00`
            : null,
          quiet_hours_end: data.quietHoursEnd
            ? `${data.quietHoursEnd}:00`
            : null,
          max_reminders_per_day: data.maxRemindersPerDay,
          allow_weekends: data.allowWeekends,
          default_snooze_options: {
            later_today: data.laterToday,
            tomorrow_morning: data.tomorrowMorning,
            next_working_day: data.nextWorkingDay,
            in_3_days: data.in3Days,
            next_week: data.nextWeek,
            pick_a_time: data.pickATime,
          },
          follow_up_cadence: data.followUpCadence,
          smart_suggestions_enabled: data.smartSuggestionsEnabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save settings");
      }

      setSaveSuccess(true);
      toast.success("Snooze preferences saved");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save snooze settings:", error);
      toast.error("Failed to save settings");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Snooze Preferences</CardTitle>
          <CardDescription>
            Configure when and how reminders are scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Snooze Preferences
        </CardTitle>
        <CardDescription>
          Configure working hours, quiet hours, and snooze behavior
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Working Hours */}
            <div className="space-y-4 border-b pb-6">
              <Label className="text-base font-semibold">Working Hours</Label>
              <p className="text-sm text-muted-foreground">
                When are you typically available for reminders?
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart">Start Time</Label>
                  <FormField
                    control={form.control}
                    name="workingHoursStart"
                    render={({ field }) => (
                      <input
                        id="workingHoursStart"
                        type="time"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd">End Time</Label>
                  <FormField
                    control={form.control}
                    name="workingHoursEnd"
                    render={({ field }) => (
                      <input
                        id="workingHoursEnd"
                        type="time"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Working Days */}
              <div className="space-y-2">
                <Label>Working Days</Label>
                <div className="flex flex-wrap gap-3">
                  {dayLabels.map((day) => (
                    <div
                      key={day.value}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={`day-${day.value}`}
                        checked={form.watch("workingDays").includes(day.value)}
                        onChange={(e) => {
                          const currentDays = form.getValues("workingDays");
                          if (e.target.checked) {
                            form.setValue(
                              "workingDays",
                              [...currentDays, day.value].sort()
                            );
                          } else {
                            form.setValue(
                              "workingDays",
                              currentDays.filter((d) => d !== day.value)
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label
                        htmlFor={`day-${day.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {day.label.slice(0, 3)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-4 border-b pb-6">
              <Label className="text-base font-semibold">
                Quiet Hours (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Times when you don't want to receive reminders
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quietHoursStart">Start Time</Label>
                  <FormField
                    control={form.control}
                    name="quietHoursStart"
                    render={({ field }) => (
                      <input
                        id="quietHoursStart"
                        type="time"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quietHoursEnd">End Time</Label>
                  <FormField
                    control={form.control}
                    name="quietHoursEnd"
                    render={({ field }) => (
                      <input
                        id="quietHoursEnd"
                        type="time"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Limits & Behavior */}
            <div className="space-y-4 border-b pb-6">
              <Label className="text-base font-semibold">
                Limits & Behavior
              </Label>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxRemindersPerDay">
                    Max Reminders Per Day
                  </Label>
                  <FormField
                    control={form.control}
                    name="maxRemindersPerDay"
                    render={({ field }) => (
                      <>
                        <input
                          id="maxRemindersPerDay"
                          type="number"
                          min={1}
                          max={100}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum reminders scheduled per day (1-100, default:
                          10)
                        </p>
                      </>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Weekend Behavior
                  </Label>
                  <FormField
                    control={form.control}
                    name="allowWeekends"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <ControlledSwitch
                          control={form.control}
                          name="allowWeekends"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="allowWeekends"
                            className="cursor-pointer"
                          >
                            {field.value
                              ? "Allow weekends"
                              : "Defer to next working day"}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {field.value
                              ? "Reminders can be scheduled on weekends"
                              : "Weekend reminders automatically move to next working day"}
                          </p>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Default Snooze Options */}
            <div className="space-y-4 border-b pb-6">
              <Label className="text-base font-semibold">
                Default Snooze Options
              </Label>
              <p className="text-sm text-muted-foreground">
                Which snooze options should be available by default?
              </p>

              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <FormField
                  control={form.control}
                  name="laterToday"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="laterToday" className="cursor-pointer">
                        Later today
                      </Label>
                      <ControlledSwitch
                        control={form.control}
                        name="laterToday"
                      />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tomorrowMorning"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="tomorrowMorning"
                        className="cursor-pointer"
                      >
                        Tomorrow morning
                      </Label>
                      <ControlledSwitch
                        control={form.control}
                        name="tomorrowMorning"
                      />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextWorkingDay"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="nextWorkingDay"
                        className="cursor-pointer"
                      >
                        Next working day
                      </Label>
                      <ControlledSwitch
                        control={form.control}
                        name="nextWorkingDay"
                      />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="in3Days"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="in3Days" className="cursor-pointer">
                        In 3 days
                      </Label>
                      <ControlledSwitch control={form.control} name="in3Days" />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextWeek"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="nextWeek" className="cursor-pointer">
                        Next week
                      </Label>
                      <ControlledSwitch
                        control={form.control}
                        name="nextWeek"
                      />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pickATime"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pickATime" className="cursor-pointer">
                        Pick a time
                      </Label>
                      <ControlledSwitch
                        control={form.control}
                        name="pickATime"
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Smart Suggestions */}
            <div className="space-y-4 border-b pb-6">
              <Label className="text-base font-semibold">
                Smart Suggestions
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable intelligent snooze suggestions based on your behavior and preferences
              </p>

              <FormField
                control={form.control}
                name="smartSuggestionsEnabled"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <ControlledSwitch
                      control={form.control}
                      name="smartSuggestionsEnabled"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="smartSuggestionsEnabled"
                        className="cursor-pointer"
                      >
                        {field.value
                          ? "Smart suggestions enabled"
                          : "Use basic snooze options only"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {field.value
                          ? "Get personalized snooze suggestions based on your patterns"
                          : "Use simple duration-based snooze (10m, 1h, etc.)"}
                      </p>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Follow-up Cadence */}
            <div className="space-y-4 border-b pb-6">
              <Label className="text-base font-semibold">
                Follow-up Cadence
              </Label>
              <p className="text-sm text-muted-foreground">
                How frequently should reminders be suggested?
              </p>

              <FormField
                control={form.control}
                name="followUpCadence"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(
                        value as "fast" | "balanced" | "light_touch"
                      )
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fast" id="fast" />
                      <Label htmlFor="fast" className="cursor-pointer">
                        Fast - More frequent reminders
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="balanced" id="balanced" />
                      <Label htmlFor="balanced" className="cursor-pointer">
                        Balanced - Moderate frequency (recommended)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light_touch" id="light_touch" />
                      <Label htmlFor="light_touch" className="cursor-pointer">
                        Light-touch - Less frequent reminders
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
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
