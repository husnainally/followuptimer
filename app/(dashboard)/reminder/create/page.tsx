"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { reminderSchema, type ReminderFormData } from "@/lib/schemas"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { ControlledInput } from "@/components/controlled-input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function CreateReminderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const initialDate = new Date(Date.now() + 60 * 60 * 1000)

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      message: "",
      remind_at: initialDate,
      tone: "motivational",
      notification_method: "email",
    },
  })

  const [dateValue, setDateValue] = useState<Date>(initialDate)
  const [timeValue, setTimeValue] = useState<string>(format(initialDate, "HH:mm"))

  useEffect(() => {
    if (!dateValue || !timeValue) return
    const [hours, minutes] = timeValue.split(":").map(Number)
    const nextDate = new Date(dateValue)
    nextDate.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    form.setValue("remind_at", nextDate, { shouldValidate: true })
  }, [dateValue, timeValue, form])

  const onSubmit = async (data: ReminderFormData) => {
    setIsLoading(true)
    const toastId = toast.loading("Creating reminder...")
    try {
      const payload = {
        ...data,
        remind_at: data.remind_at instanceof Date ? data.remind_at.toISOString() : data.remind_at,
      }

      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || "Failed to create reminder")
      }

      toast.success("Reminder created successfully", { id: toastId })
      router.push("/reminder")
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || "Failed to create reminder", { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header with Back Button */}
      

      {/* Form Card */}
      <Card className="bg-[#FAFAFA] ">
        <CardHeader className="border-b">
          <CardTitle>Reminder Details</CardTitle>
          <CardDescription>Fill in the details for your reminder</CardDescription>
        </CardHeader>
        <CardContent className="">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Message Input */}
              <ControlledInput
                name="message"
                label="Reminder Message"
                placeholder="What do you want to be reminded about?"
                description="Keep it clear and concise"
                required
                startIcon={<Clock className="w-4 h-4" />}
              />

              {/* Remind At - Date and Time */}
              <div className="space-y-3 overflow-hidden">
                <label className="block text-sm font-medium">
                  Remind At <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="remind-date" className="px-1 text-xs uppercase text-muted-foreground tracking-wide">
                      Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          id="remind-date"
                          className={cn(
                            "w-48 justify-between font-normal",
                            !dateValue && "text-muted-foreground"
                          )}
                        >
                          {dateValue ? format(dateValue, "PPP") : "Select date"}
                          <CalendarIcon className=" h-4 w-4 opacity-70" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateValue}
                          onSelect={(date) => date && setDateValue(date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="remind-time" className="px-1 text-xs uppercase text-muted-foreground tracking-wide">
                      Time
                    </Label>
                    <Input
                      id="remind-time"
                      type="time"
                      step="60"
                      value={timeValue}
                      onChange={(event) => setTimeValue(event.target.value)}
                      className="bg-white appearance-none w-40 [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                </div>
                {form.formState.errors.remind_at && (
                  <p className="text-sm text-destructive">{form.formState.errors.remind_at.message}</p>
                )}
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Affirmation Tone <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["motivational", "professional", "playful"] as const).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => form.setValue("tone", tone)}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-medium capitalize ${
                        form.watch("tone") === tone
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-white text-foreground hover:border-primary/50"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="">
                  {isLoading ? "Creating..." : "Create Reminder"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
