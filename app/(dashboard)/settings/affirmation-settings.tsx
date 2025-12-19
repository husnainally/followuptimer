"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { ControlledSwitch } from "@/components/controlled-switch";
import { Check, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const affirmationSettingsSchema = z.object({
  salesMomentumEnabled: z.boolean().default(true),
  calmProductivityEnabled: z.boolean().default(true),
  consistencyEnabled: z.boolean().default(true),
  resilienceEnabled: z.boolean().default(true),
  focusEnabled: z.boolean().default(true),
  generalPositiveEnabled: z.boolean().default(true),
  globalCooldownMinutes: z.number().min(0).max(1440).default(30),
  dailyCap: z.number().min(1).max(100).default(10),
  tonePreference: z.enum(["sales", "calm", "mixed"]).default("mixed"),
});

type AffirmationSettingsFormData = z.infer<typeof affirmationSettingsSchema>;

const categoryLabels: Record<string, { label: string; description: string }> = {
  salesMomentumEnabled: {
    label: "Sales Momentum",
    description: "Motivational messages for sales and follow-ups",
  },
  calmProductivityEnabled: {
    label: "Calm Productivity",
    description: "Gentle reminders to stay focused and calm",
  },
  consistencyEnabled: {
    label: "Consistency & Habits",
    description: "Encouragement for building consistent habits",
  },
  resilienceEnabled: {
    label: "Resilience & Confidence",
    description: "Messages to build resilience and confidence",
  },
  focusEnabled: {
    label: "Focus & Execution",
    description: "Reminders to stay focused and take action",
  },
  generalPositiveEnabled: {
    label: "General Positive",
    description: "General positive and uplifting messages",
  },
};

export function AffirmationSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<AffirmationSettingsFormData>({
    resolver: zodResolver(affirmationSettingsSchema),
    defaultValues: {
      salesMomentumEnabled: true,
      calmProductivityEnabled: true,
      consistencyEnabled: true,
      resilienceEnabled: true,
      focusEnabled: true,
      generalPositiveEnabled: true,
      globalCooldownMinutes: 30,
      dailyCap: 10,
      tonePreference: "mixed",
    },
  });

  useEffect(() => {
    loadAffirmationSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAffirmationSettings() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: preferences } = await supabase
          .from("user_affirmation_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (preferences) {
          form.reset({
            salesMomentumEnabled: preferences.sales_momentum_enabled ?? true,
            calmProductivityEnabled: preferences.calm_productivity_enabled ?? true,
            consistencyEnabled: preferences.consistency_enabled ?? true,
            resilienceEnabled: preferences.resilience_enabled ?? true,
            focusEnabled: preferences.focus_enabled ?? true,
            generalPositiveEnabled: preferences.general_positive_enabled ?? true,
            globalCooldownMinutes: preferences.global_cooldown_minutes ?? 30,
            dailyCap: preferences.daily_cap ?? 10,
            tonePreference: (preferences.tone_preference as "sales" | "calm" | "mixed") || "mixed",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load affirmation settings:", error);
      // Don't show error if preferences don't exist yet (will be created on save)
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: AffirmationSettingsFormData) {
    // Validate at least one category is enabled
    const enabledCategories = [
      data.salesMomentumEnabled,
      data.calmProductivityEnabled,
      data.consistencyEnabled,
      data.resilienceEnabled,
      data.focusEnabled,
      data.generalPositiveEnabled,
    ].filter(Boolean);

    if (enabledCategories.length === 0) {
      toast.error("At least one affirmation category must be enabled");
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to save settings");
        return;
      }

      const { error } = await supabase
        .from("user_affirmation_preferences")
        .upsert({
          user_id: user.id,
          sales_momentum_enabled: data.salesMomentumEnabled,
          calm_productivity_enabled: data.calmProductivityEnabled,
          consistency_enabled: data.consistencyEnabled,
          resilience_enabled: data.resilienceEnabled,
          focus_enabled: data.focusEnabled,
          general_positive_enabled: data.generalPositiveEnabled,
          global_cooldown_minutes: data.globalCooldownMinutes,
          daily_cap: data.dailyCap,
          tone_preference: data.tonePreference,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSaveSuccess(true);
      toast.success("Affirmation preferences saved");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save affirmation settings:", error);
      toast.error("Failed to save settings");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Affirmation Preferences</CardTitle>
          <CardDescription>Customize which affirmations you see</CardDescription>
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
          <Sparkles className="w-5 h-5" />
          Affirmation Preferences
        </CardTitle>
        <CardDescription>
          Choose which affirmation categories to see and control how often they appear
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Category Toggles */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Affirmation Categories</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable specific affirmation categories. At least one category must be enabled.
              </p>
              
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                {Object.entries(categoryLabels).map(([key, { label, description }]) => (
                  <div key={key} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                    <div className="flex-1">
                      <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{description}</p>
                    </div>
                    <ControlledSwitch
                      control={form.control}
                      name={key as keyof AffirmationSettingsFormData}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tone Preference */}
            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-semibold">Tone Preference</Label>
              <p className="text-sm text-muted-foreground">
                Choose the overall tone of affirmations you want to see
              </p>

              <FormField
                control={form.control}
                name="tonePreference"
                render={({ field }) => (
                  <div className="space-y-2">
                    <select
                      id="tonePreference"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value as "sales" | "calm" | "mixed")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="mixed">Mixed (All categories)</option>
                      <option value="sales">Sales (Sales Momentum, Focus, Consistency)</option>
                      <option value="calm">Calm (Calm Productivity, Resilience, General Positive)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Sales: Focused on sales momentum and action. Calm: Focused on productivity and resilience. Mixed: All categories balanced.
                    </p>
                  </div>
                )}
              />
            </div>

            {/* Frequency Controls */}
            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-semibold">Frequency Controls</Label>
              <p className="text-sm text-muted-foreground">
                Control how often affirmations appear in your popups
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="globalCooldownMinutes">Global Cooldown (minutes)</Label>
                  <FormField
                    control={form.control}
                    name="globalCooldownMinutes"
                    render={({ field }) => (
                      <>
                        <input
                          id="globalCooldownMinutes"
                          type="number"
                          min={0}
                          max={1440}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-xs text-muted-foreground">
                          Minimum time between showing any affirmation (0-1440 minutes, default: 30)
                        </p>
                      </>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyCap">Daily Cap</Label>
                  <FormField
                    control={form.control}
                    name="dailyCap"
                    render={({ field }) => (
                      <>
                        <input
                          id="dailyCap"
                          type="number"
                          min={1}
                          max={100}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum affirmations to show per day (1-100, default: 10)
                        </p>
                      </>
                    )}
                  />
                </div>
              </div>
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

