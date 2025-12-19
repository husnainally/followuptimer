"use client";

import * as React from "react";
import { Calendar, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DateTimePickerProps {
  onSelect: (date: Date) => void;
  onCancel: () => void;
  minDate?: Date;
  maxDate?: Date;
}

export function DateTimePicker({
  onSelect,
  onCancel,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [time, setTime] = React.useState<string>("09:00");
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const handleSubmit = () => {
    if (!date) return;

    const [hours, minutes] = time.split(":").map(Number);
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(hours, minutes, 0, 0);

    onSelect(selectedDateTime);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-background">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Pick a date and time</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Date Picker */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                selected={date}
                onSelect={(selectedDate: Date | undefined) => {
                  setDate(selectedDate);
                  setCalendarOpen(false);
                }}
                disabled={(date: Date) => {
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Picker */}
        <div className="space-y-2">
          <Label>Time</Label>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!date || !time}>
          Set Reminder
        </Button>
      </div>
    </div>
  );
}
