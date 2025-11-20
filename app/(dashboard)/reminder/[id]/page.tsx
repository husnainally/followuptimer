"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Form } from "@/components/ui/form"
import { reminderSchema, type ReminderFormData } from "@/lib/schemas"
import { Clock, Trash2, AlertCircle } from "lucide-react"
import { ControlledInput } from "@/components/controlled-input"
import { toast } from "sonner"

export default function ReminderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const reminderId = params?.id as string
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ created_at?: Date; updated_at?: Date; status?: string } | null>(null)

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      message: "",
      remind_at: new Date(Date.now() + 60 * 60 * 1000),
      tone: "motivational",
      notification_method: "email",
    },
  })

  const formatDisplayDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))

  const loadReminder = useCallback(async () => {
    if (!reminderId) return
    setInitialLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/reminders/${reminderId}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load reminder")
      }

      const reminder = payload?.reminder
      const remindAtDate = reminder?.remind_at ? new Date(reminder.remind_at) : new Date()

      form.reset({
        message: reminder?.message ?? "",
        remind_at: remindAtDate,
        tone: reminder?.tone ?? "motivational",
        notification_method: reminder?.notification_method ?? "email",
      })

      setMeta({
        created_at: reminder?.created_at ? new Date(reminder.created_at) : undefined,
        updated_at: reminder?.updated_at ? new Date(reminder.updated_at) : undefined,
        status: reminder?.status,
      })
    } catch (error: any) {
      const message = error?.message || "Failed to load reminder"
      setLoadError(message)
      toast.error(message)
    } finally {
      setInitialLoading(false)
    }
  }, [reminderId, form])

  useEffect(() => {
    loadReminder()
  }, [loadReminder])

  const toneValue = form.watch("tone")
  const createdAtDisplay = meta?.created_at ? formatDisplayDate(meta.created_at) : "—"
  const updatedAtDisplay = meta?.updated_at ? formatDisplayDate(meta.updated_at) : "—"
  const statusDisplay = meta?.status ? meta.status.replace("_", " ") : "pending"

  if (!reminderId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive">Invalid reminder ID</p>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading reminder...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-destructive">{loadError}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/reminder")}>
            Go back
          </Button>
          <Button onClick={loadReminder}>Retry</Button>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: ReminderFormData) => {
    if (!reminderId) return
    setIsLoading(true)
    const toastId = toast.loading("Updating reminder...")
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          remind_at: data.remind_at instanceof Date ? data.remind_at.toISOString() : data.remind_at,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update reminder")
      }

      const reminder = payload?.reminder
      if (reminder) {
        setMeta({
          created_at: reminder?.created_at ? new Date(reminder.created_at) : meta?.created_at,
          updated_at: reminder?.updated_at ? new Date(reminder.updated_at) : new Date(),
          status: reminder?.status ?? meta?.status,
        })
      }

      toast.success("Reminder updated", { id: toastId })
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || "Failed to update reminder", { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!reminderId) return
    setIsDeleting(true)
    const toastId = toast.loading("Deleting reminder...")
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, { method: "DELETE" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete reminder")
      }

      toast.success("Reminder deleted", { id: toastId })
      router.push("/reminder")
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete reminder", { id: toastId })
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with Back Button */}
     

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Card */}
        <div className="lg:col-span-2">
          <Card className="">
            <CardHeader className="border-b">
              <CardTitle>Reminder Details</CardTitle>
              <CardDescription>Modify your reminder settings</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Message Input */}
                  <ControlledInput
                    name="message"
                    label="Reminder Message"
                    placeholder="What do you want to be reminded about?"
                    startIcon={<Clock className="w-4 h-4" />}
                  />

                  {/* Remind At */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Remind At <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      {...form.register("remind_at", {
                        setValueAs: (value) => new Date(value),
                      })}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {form.formState.errors.remind_at && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.remind_at.message}</p>
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
                              : "border-border bg-background text-foreground hover:border-primary/50"
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
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Info and Delete */}
        <div className="flex flex-col gap-4">
          {/* Info Card */}
          <Card className="">
            
            <CardContent className=" space-y-3">
              <p className="text-sm font-medium">Reminder Info</p>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Created</p>
                <p className="text-sm mt-1">{createdAtDisplay}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Last Updated</p>
                <p className="text-sm mt-1">{updatedAtDisplay}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Tone</p>
                <Badge className="mt-2 capitalize bg-primary/10 text-primary border-0">{toneValue}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
                <Badge variant="outline" className="mt-2 capitalize border-border/60">
                  {statusDisplay}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Delete Card */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="border-b ">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="">
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete this reminder. This action cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Reminder
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Are you sure?</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className=""
                      disabled={isDeleting}
                      onClick={handleDelete}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
