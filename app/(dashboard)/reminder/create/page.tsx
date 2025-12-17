"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { reminderSchema, type ReminderFormData } from "@/lib/schemas"
import { Calendar as CalendarIcon } from "lucide-react"
import { ControlledInput } from "@/components/controlled-input"
import { ControlledTextarea } from "@/components/controlled-textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Contact {
  id: string;
  name: string;
}

export default function CreateReminderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    searchParams.get("contact_id")
  )
  const initialDate = new Date(Date.now() + 60 * 60 * 1000)

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      message: "",
      remind_at: initialDate,
      tone: "motivational",
      notification_method: "email",
      affirmation_enabled: true,
    },
  })

  const [dateValue, setDateValue] = useState<Date>(initialDate)
  const [timeValue, setTimeValue] = useState<string>(format(initialDate, "HH:mm"))

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    if (!dateValue || !timeValue) return
    const [hours, minutes] = timeValue.split(":").map(Number)
    const nextDate = new Date(dateValue)
    nextDate.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    form.setValue("remind_at", nextDate, { shouldValidate: true })
  }, [dateValue, timeValue, form])

  async function fetchContacts() {
    try {
      const response = await fetch("/api/contacts")
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error)
    }
  }

  const onSubmit = async (data: ReminderFormData) => {
    setIsLoading(true)
    const toastId = toast.loading("Creating reminder...")
    try {
      const payload = {
        ...data,
        remind_at: data.remind_at instanceof Date ? data.remind_at.toISOString() : data.remind_at,
        contact_id: selectedContactId || null,
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
      <Card className="bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle>Reminder Details</CardTitle>
          <CardDescription>Fill in the details for your reminder</CardDescription>
        </CardHeader>
        <CardContent className="">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Message Input */}
              <ControlledTextarea
                name="message"
                label="Reminder Message"
                placeholder="What do you want to be reminded about?"
                description="Keep it clear and concise"
                required
                className="border border-border bg-white"
                rows={4}
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
                      className="bg-white border border-border appearance-none w-full [&::-webkit-calendar-picker-indicator]:hidden"
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["motivational", "professional", "playful", "simple"] as const).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => form.setValue("tone", tone)}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-medium capitalize ${
                        form.watch("tone") === tone
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Selection */}
              {contacts.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="contact">Link to Contact (Optional)</Label>
                  <Select
                    value={selectedContactId || ""}
                    onValueChange={(value) => setSelectedContactId(value || null)}
                  >
                    <SelectTrigger id="contact">
                      <SelectValue placeholder="Select a contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this reminder to a contact to track follow-ups
                  </p>
                </div>
              )}

              {/* Affirmation Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div>
                  <label className="block text-sm font-medium">Include Affirmation</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add a motivational message with your reminder
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.watch("affirmation_enabled") ?? true}
                  onChange={(e) => form.setValue("affirmation_enabled", e.target.checked)}
                  className="h-5 w-5 rounded border-border"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
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
