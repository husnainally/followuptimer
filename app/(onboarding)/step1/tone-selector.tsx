"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ToneFormData, toneSchema } from "@/lib/schemas";
import { LoadingButton } from "@/components/loading-button";
import { useRouter } from "next/navigation";

const TONE_OPTIONS = [
  {
    id: "motivational",
    label: "Motivational",
    description: "Energetic and encouraging",
  },
  {
    id: "professional",
    label: "Professional",
    description: "Formal and business-like",
  },
  { id: "playful", label: "Playful", description: "Fun and lighthearted" },
];

export function ToneSelector() {
  const router = useRouter();
  const form = useForm<ToneFormData>({
    resolver: zodResolver(toneSchema),
  });

  const selectedTone = form.watch("tone");
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: ToneFormData) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success("Tone preference saved");
    router.push("/step2");
    console.log("Tone selected:", data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="tone"
          render={({ field }) => (
            <FormItem className="space-y-3">
              {TONE_OPTIONS.map((option) => {
                const isActive = selectedTone === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex items-start gap-4 rounded-2xl border p-4 transition-colors ${
                      isActive ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={option.id}
                      checked={isActive}
                      onChange={() => field.onChange(option.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <FormLabel className="text-base font-semibold">
                        {option.label}
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </label>
                );
              })}
            </FormItem>
          )}
        />

        <LoadingButton
          type="submit"
          className="w-full"
          isLoading={isSubmitting}
          disabled={!selectedTone}
          loadingText="Saving..."
        >
          Continue
        </LoadingButton>
      </form>
    </Form>
  );
}
