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
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const toneSettingsSchema = z.object({
  toneStyle: z.enum(["neutral", "supportive", "direct", "motivational", "minimal"]),
});

type ToneSettingsFormData = z.infer<typeof toneSettingsSchema>;

const toneDescriptions: Record<string, { label: string; description: string; example: string }> = {
  neutral: {
    label: "Neutral",
    description: "Professional and straightforward communication",
    example: "Reminder snoozed until 9:00am.",
  },
  supportive: {
    label: "Supportive",
    description: "Warm and encouraging tone",
    example: "All set — we'll remind you again at 9:00am.",
  },
  direct: {
    label: "Direct",
    description: "Concise and to the point",
    example: "Snoozed to 09:00.",
  },
  motivational: {
    label: "Motivational",
    description: "Energetic and inspiring",
    example: "Reminder rescheduled to 9:00am. Stay on track!",
  },
  minimal: {
    label: "Minimal",
    description: "Brief and minimal messaging",
    example: "9:00am",
  },
};

export function ToneSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(true);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [entitlement, setEntitlement] = useState<{
    enabled: boolean;
    limit: number | null;
  } | null>(null);

  const form = useForm<ToneSettingsFormData>({
    resolver: zodResolver(toneSettingsSchema),
    defaultValues: {
      toneStyle: "neutral",
    },
  });

  useEffect(() => {
    loadPlanAndSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlanAndSettings() {
    try {
      // Load plan and entitlements
      const planResponse = await fetch("/api/plans");
      if (planResponse.ok) {
        const planData = await planResponse.json();
        const toneEntitlement = planData.entitlements?.find(
          (e: any) => e.feature === "tone_variants"
        );
        setEntitlement(toneEntitlement || { enabled: true, limit: null });
        setHasProAccess(
          planData.plan?.plan_type === "PRO" ||
            planData.plan?.plan_type === "TEAM" ||
            planData.plan?.subscription_status === "trialing"
        );
      }
      setPlanLoading(false);

      // Load current preferences
      await loadToneSettings();
    } catch (error) {
      console.error("Failed to load plan:", error);
      setPlanLoading(false);
      await loadToneSettings();
    }
  }

  async function loadToneSettings() {
    try {
      const response = await fetch("/api/preferences");
      if (!response.ok) {
        throw new Error("Failed to load preferences");
      }

      const data = await response.json();
      if (data.preferences) {
        form.reset({
          toneStyle: data.preferences.tone_style || "neutral",
        });
      }
    } catch (error) {
      console.error("Failed to load tone settings:", error);
      toast.error("Failed to load tone settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveToneSettings(data: ToneSettingsFormData) {
    try {
      // Check if user is trying to use a PRO-only tone
      if (!hasProAccess && data.toneStyle !== "neutral") {
        toast.error(
          "Advanced tone variants are available on PRO. Upgrade to unlock all tones."
        );
        return;
      }

      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tone_style: data.toneStyle,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      setSaveSuccess(true);
      toast.success("Tone settings saved successfully");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save tone settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save tone settings"
      );
    }
  }

  // Get available tones based on plan
  const availableTones = hasProAccess
    ? Object.keys(toneDescriptions)
    : ["neutral"]; // FREE users only get neutral

  if (loading || planLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedTone = form.watch("toneStyle");
  const isLocked = !hasProAccess;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance & Tone</CardTitle>
        <CardDescription>
          Choose how FollowUp Timer communicates with you. Tone affects notification messages, status explanations, and UI copy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(saveToneSettings)}
            className="space-y-6"
          >
            {isLocked && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Advanced tone variants are available on PRO. Upgrade to unlock
                  all tone options.
                </AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="toneStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tone Style
                    {isLocked && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Limited to Neutral on FREE plan)
                      </span>
                    )}
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLocked}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTones.map((key) => {
                        const { label, description } = toneDescriptions[key];
                        const isProOnly = key !== "neutral";
                        return (
                          <SelectItem
                            key={key}
                            value={key}
                            disabled={isLocked && isProOnly}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {label}
                                {isProOnly && !isLocked && (
                                  <span className="ml-2 text-xs text-primary">
                                    PRO
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {description}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This tone will be applied to all notifications, status
                    messages, and UI copy.
                    {isLocked && (
                      <span className="block mt-1">
                        Upgrade to PRO to unlock all tone variants.
                      </span>
                    )}
                  </FormDescription>
                </FormItem>
              )}
            />

            {selectedTone && (
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <p className="text-sm text-muted-foreground">
                  "{toneDescriptions[selectedTone].example}"
                </p>
              </div>
            )}

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

