"use client";

import * as React from "react";
import { Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "./date-time-picker";

export interface SnoozeCandidate {
  type: string;
  scheduledTime: string;
  label: string;
  score: number;
  recommended?: boolean;
  adjusted: boolean;
}

interface SnoozeSuggestionsProps {
  candidates: SnoozeCandidate[];
  onSelect: (candidate: SnoozeCandidate) => void;
  onPickTime: (time: Date) => void;
  isLoading?: boolean;
}

export function SnoozeSuggestions({
  candidates,
  onSelect,
  onPickTime,
  isLoading,
}: SnoozeSuggestionsProps) {
  const [showPicker, setShowPicker] = React.useState(false);

  const handleSelect = (candidate: SnoozeCandidate) => {
    if (candidate.type === "pick_a_time") {
      setShowPicker(true);
    } else {
      onSelect(candidate);
    }
  };

  const handlePickTime = (time: Date) => {
    onPickTime(time);
    setShowPicker(false);
  };

  if (showPicker) {
    return (
      <div className="space-y-2">
        <DateTimePicker
          onSelect={handlePickTime}
          onCancel={() => setShowPicker(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {candidates.map((candidate) => (
        <Button
          key={candidate.type}
          size="sm"
          variant={candidate.recommended ? "default" : "outline"}
          onClick={() => handleSelect(candidate)}
          disabled={isLoading}
          className="relative"
        >
          <Clock className="h-4 w-4 mr-2" />
          {candidate.label}
          {candidate.recommended && (
            <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Recommended
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}
