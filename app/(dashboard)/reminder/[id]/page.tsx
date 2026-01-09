"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import { reminderSchema, type ReminderFormData } from "@/lib/schemas";
import {
  Calendar as CalendarIcon,
  Trash2,
  AlertCircle,
  User,
  StickyNote,
  Repeat,
} from "lucide-react";
import { ControlledTextarea } from "@/components/controlled-textarea";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { StatusExplanation } from "@/components/reminder/status-explanation";
import { AuditTimeline } from "@/components/reminder/audit-timeline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function ReminderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reminderId = params?.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    created_at?: Date;
    updated_at?: Date;
    status?: string;
    snoozed_until?: Date | null;
  } | null>(null);
  const [suppressionDetails, setSuppressionDetails] = useState<any>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isCreatingFollowup, setIsCreatingFollowup] = useState(false);

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      message: "",
      remind_at: new Date(Date.now() + 60 * 60 * 1000),
      tone: "motivational",
      notification_method: "email",
      affirmation_enabled: false,
    },
  });
  const initialDate = new Date(Date.now() + 60 * 60 * 1000);
  const [dateValue, setDateValue] = useState<Date>(initialDate);
  const [timeValue, setTimeValue] = useState<string>(
    format(initialDate, "HH:mm")
  );

  const formatDisplayDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const loadReminder = useCallback(async () => {
    if (!reminderId) return;
    setInitialLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/reminders/${reminderId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load reminder");
      }

      const reminder = payload?.reminder;
      const remindAtDate = reminder?.remind_at
        ? new Date(reminder.remind_at)
        : new Date();

      form.reset({
        message: reminder?.message ?? "",
        remind_at: remindAtDate,
        tone: reminder?.tone ?? "motivational",
        notification_method: reminder?.notification_method ?? "email",
        affirmation_enabled: reminder?.affirmation_enabled ?? false,
      });
      setDateValue(remindAtDate);
      setTimeValue(format(remindAtDate, "HH:mm"));

      setMeta({
        created_at: reminder?.created_at
          ? new Date(reminder.created_at)
          : undefined,
        updated_at: reminder?.updated_at
          ? new Date(reminder.updated_at)
          : undefined,
        status: reminder?.status,
        snoozed_until: reminder?.snoozed_until
          ? new Date(reminder.snoozed_until)
          : null,
      });

      // Store contact info if linked
      if (reminder?.contact_id) {
        setContactId(reminder.contact_id);
        // Fetch contact name
        fetch(`/api/contacts/${reminder.contact_id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.contact) {
              setContactName(data.contact.name);
            }
          })
          .catch(() => {
            // Fail silently
          });
      } else {
        setContactId(null);
        setContactName(null);
      }

      // Fetch suppression details if status is suppressed
      if (reminder?.status === "suppressed" || reminder?.status === "pending") {
        try {
          const auditResponse = await fetch(
            `/api/reminders/${reminderId}/audit`
          );
          if (auditResponse.ok) {
            const auditData = await auditResponse.json();
            setSuppressionDetails(auditData.suppressionDetails);
          }
        } catch (err) {
          // Fail silently - suppression details are optional
          console.error("Failed to fetch suppression details:", err);
        }
      }
    } catch (error: any) {
      const message = error?.message || "Failed to load reminder";
      setLoadError(message);
      toast.error(message);
    } finally {
      setInitialLoading(false);
    }
  }, [reminderId, form]);

  useEffect(() => {
    loadReminder();
  }, [loadReminder]);

  useEffect(() => {
    if (!dateValue || !timeValue) return;
    const [hours, minutes] = timeValue.split(":").map(Number);
    const nextDate = new Date(dateValue);
    nextDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    form.setValue("remind_at", nextDate, { shouldValidate: true });
  }, [dateValue, timeValue, form]);

  const toneValue = form.watch("tone");
  const createdAtDisplay = meta?.created_at
    ? formatDisplayDate(meta.created_at)
    : "—";
  const updatedAtDisplay = meta?.updated_at
    ? formatDisplayDate(meta.updated_at)
    : "—";
  const statusDisplay = meta?.status
    ? meta.status.replace("_", " ")
    : "pending";

  if (!reminderId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive">Invalid reminder ID</p>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 animate-[fadeIn_0.3s_ease-in-out_forwards]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-card">
              <CardHeader className="border-b border-border">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <Card className="bg-card">
              <CardContent className="space-y-3 pt-6">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="border-b border-border">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
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
    );
  }

  const onSubmit = async (data: ReminderFormData) => {
    if (!reminderId) return;
    setIsLoading(true);
    const toastId = toast.loading("Updating reminder...");
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          remind_at:
            data.remind_at instanceof Date
              ? data.remind_at.toISOString()
              : data.remind_at,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update reminder");
      }

      const reminder = payload?.reminder;
      if (reminder) {
        setMeta({
          created_at: reminder?.created_at
            ? new Date(reminder.created_at)
            : meta?.created_at,
          updated_at: reminder?.updated_at
            ? new Date(reminder.updated_at)
            : new Date(),
          status: reminder?.status ?? meta?.status,
        });
      }

      toast.success("Reminder updated", { id: toastId });
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update reminder", {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reminderId) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting reminder...");
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete reminder");
      }

      toast.success("Reminder deleted", { id: toastId });
      router.push("/reminder");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete reminder", {
        id: toastId,
      });
      setIsDeleting(false);
    }
  };

  const handleCreateFollowup = async () => {
    if (!reminderId || !contactId) return;

    setIsCreatingFollowup(true);
    const toastId = toast.loading("Creating follow-up reminder...");

    try {
      const response = await fetch("/api/reminders/create-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_reminder_id: reminderId,
          contact_id: contactId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to create follow-up");
      }

      const data = await response.json();
      toast.success("Follow-up reminder created successfully", { id: toastId });

      // Navigate to the new reminder
      if (data.reminder?.id) {
        router.push(`/reminder/${data.reminder.id}`);
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to create follow-up", {
        id: toastId,
      });
    } finally {
      setIsCreatingFollowup(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with Back Button */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Card */}
        <div className="lg:col-span-2">
          <Card className="bg-card">
            <CardHeader className="border-b border-border">
              <h1 className="leading-none font-semibold text-lg">Reminder Details</h1>
              <CardDescription>Modify your reminder settings</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Message Input */}
                  <ControlledTextarea
                    name="message"
                    label="Reminder Message"
                    placeholder="What do you want to be reminded about?"
                    description="Keep it clear and actionable"
                    required
                    rows={4}
                    className="border border-border bg-white"
                  />

                  {/* Remind At */}
                  <div className="space-y-3 overflow-hidden">
                    <label className="block text-sm font-medium">
                      Remind At <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex flex-col gap-2">
                        <Label
                          htmlFor="remind-date"
                          className="px-1 text-xs uppercase text-muted-foreground tracking-wide"
                        >
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
                              {dateValue
                                ? format(dateValue, "PPP")
                                : "Select date"}
                              <CalendarIcon className="h-4 w-4 opacity-70" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="start"
                          >
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
                        <Label
                          htmlFor="remind-time"
                          className="px-1 text-xs uppercase text-muted-foreground tracking-wide"
                        >
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
                      <p className="text-sm text-destructive">
                        {form.formState.errors.remind_at.message}
                      </p>
                    )}
                  </div>

                  {/* Tone Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Affirmation Tone <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(
                        ["motivational", "professional", "playful"] as const
                      ).map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => form.setValue("tone", tone)}
                          className={`p-3 rounded-lg border-2 transition-all text-sm font-medium capitalize ${
                            form.watch("tone") === tone
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-card text-foreground hover:border-primary/50"
                          }`}
                          aria-label={`Select ${tone} tone`}
                          aria-pressed={form.watch("tone") === tone}
                          role="radio"
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      aria-label="Cancel and go back"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1"
                      aria-label={isLoading ? "Saving reminder changes" : "Save reminder changes"}
                    >
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
          {/* Quick Actions Card */}
          {contactId && (
            <Card className="bg-card">
              <CardHeader className="pb-3">
                <h2 className="text-base leading-none font-semibold">Quick Actions</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/contacts/${contactId}`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    aria-label={`View contact: ${contactName || "Contact"}`}
                  >
                    <User className="w-4 h-4" aria-hidden="true" />
                    View Contact: {contactName || "Contact"}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setAddNoteDialogOpen(true)}
                  aria-label="Add note to contact"
                >
                  <StickyNote className="w-4 h-4" aria-hidden="true" />
                  Add Note
                </Button>
                {meta?.status === "sent" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleCreateFollowup}
                    disabled={isCreatingFollowup}
                    aria-label={isCreatingFollowup ? "Creating follow-up reminder" : "Create next follow-up reminder"}
                  >
                    <Repeat className="w-4 h-4" aria-hidden="true" />
                    {isCreatingFollowup
                      ? "Creating..."
                      : "Create Next Follow-up"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-card">
            <CardContent className="space-y-3 pt-6">
              <h2 className="text-sm font-medium">Reminder Info</h2>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Created
                </p>
                <p className="text-sm mt-1">{createdAtDisplay}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Last Updated
                </p>
                <p className="text-sm mt-1">{updatedAtDisplay}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Tone
                </p>
                <Badge className="mt-2 capitalize bg-primary/10 text-primary border-0">
                  {toneValue}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Status
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 capitalize border-border/60",
                    statusDisplay === "completed" &&
                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                    statusDisplay === "suppressed" &&
                      "bg-amber-50 text-amber-700 border-amber-200",
                    statusDisplay === "snoozed" &&
                      "bg-blue-50 text-blue-700 border-blue-200",
                    statusDisplay === "pending" &&
                      "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  {statusDisplay}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Status Explanation */}
          {meta?.status && (
            <StatusExplanation
              status={meta.status}
              remindAt={form.watch("remind_at")}
              suppressionDetails={suppressionDetails}
              snoozedUntil={meta.snoozed_until}
            />
          )}

          {/* Audit Timeline */}
          <AuditTimeline reminderId={reminderId} />

          {/* Delete Card */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="border-b border-destructive/20">
              <h2 className="text-base leading-none font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                Danger Zone
              </h2>
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
                  aria-label="Delete this reminder"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
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
                      aria-label="Cancel deletion"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className=""
                      disabled={isDeleting}
                      onClick={handleDelete}
                      aria-label={isDeleting ? "Deleting reminder" : "Confirm delete reminder"}
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

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note to Contact</DialogTitle>
            <DialogDescription>
              Add a note to {contactName || "this contact"}. This will be
              appended to the contact's notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Enter your note here..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddNoteDialogOpen(false);
                setNoteText("");
              }}
              disabled={isAddingNote}
              aria-label="Cancel adding note"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!noteText.trim() || !contactId) return;

                setIsAddingNote(true);
                try {
                  // Use the notes API endpoint for proper history tracking
                  const response = await fetch(
                    `/api/contacts/${contactId}/notes`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        note_text: noteText.trim(),
                        reminder_id: reminderId || null,
                      }),
                    }
                  );

                  if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error || "Failed to add note");
                  }

                  toast.success("Note added successfully");
                  setAddNoteDialogOpen(false);
                  setNoteText("");
                } catch (error: any) {
                  console.error("Failed to add note:", error);
                  toast.error(error.message || "Failed to add note");
                } finally {
                  setIsAddingNote(false);
                }
              }}
              disabled={isAddingNote || !noteText.trim()}
              aria-label={isAddingNote ? "Adding note" : "Add note to contact"}
            >
              {isAddingNote ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
