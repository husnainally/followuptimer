"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateAffirmation, type Tone } from "@/lib/affirmations";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function AffirmationBar() {
  const [affirmation, setAffirmation] = useState<string>("");
  const [tone, setTone] = useState<Tone>("motivational");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAffirmation();
  }, []);

  async function loadAffirmation() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tone_preference")
          .eq("id", user.id)
          .single();

        const userTone = (profile?.tone_preference || "motivational") as Tone;
        setTone(userTone);
        setAffirmation(generateAffirmation(userTone));
      }
    } catch (error) {
      console.error("Failed to load affirmation:", error);
      setAffirmation(generateAffirmation("motivational"));
    } finally {
      setLoading(false);
    }
  }

  async function refreshAffirmation() {
    setRefreshing(true);
    // Small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300));
    setAffirmation(generateAffirmation(tone));
    setRefreshing(false);
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="rounded-full p-2 bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-medium italic text-foreground flex-1">
              {affirmation}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshAffirmation}
            disabled={refreshing}
            className="shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

