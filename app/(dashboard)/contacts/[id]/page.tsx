"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, FileText, Plus, Calendar, Clock, GitMerge } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { RemindersTable } from "@/app/(dashboard)/reminders-table";
import { format } from "date-fns";
import { ContactHistory } from "@/components/contact/contact-history";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface Reminder {
  id: string;
  message: string;
  remind_at: Date;
  tone: string;
  status: string;
  notification_method?: string;
  created_at: Date;
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    if (contactId) {
      fetchContact();
    }
  }, [contactId]);

  async function fetchContact() {
    try {
      const response = await fetch(`/api/contacts/${contactId}`);
      if (!response.ok) throw new Error("Failed to fetch contact");
      const data = await response.json();
      setContact(data.contact);
      setReminders(
        (data.reminders || []).map((r: any) => ({
          ...r,
          remind_at: new Date(r.remind_at),
          created_at: new Date(r.created_at),
        }))
      );
    } catch (error) {
      console.error("Failed to fetch contact:", error);
      toast.error("Failed to load contact");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableContacts() {
    try {
      const response = await fetch("/api/contacts");
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      // Filter out current contact and archived contacts
      const available = (data.contacts || []).filter(
        (c: Contact) => c.id !== contactId && !c.archived_at
      );
      setAvailableContacts(available);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      toast.error("Failed to load contacts");
    }
  }

  async function handleMerge() {
    if (!selectedContactId) {
      toast.error("Please select a contact to merge with");
      return;
    }

    setIsMerging(true);
    try {
      const response = await fetch("/api/contacts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_contact_id: contactId,
          secondary_contact_id: selectedContactId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to merge contacts");
      }

      toast.success("Contacts merged successfully");
      setMergeDialogOpen(false);
      setSelectedContactId("");
      router.push(`/contacts/${contactId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Failed to merge contacts:", error);
      toast.error(error.message || "Failed to merge contacts");
    } finally {
      setIsMerging(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Contact not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{contact.name}</h1>
            <p className="text-muted-foreground mt-1">
              Contact details and linked reminders
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setMergeDialogOpen(true);
              fetchAvailableContacts();
            }}
            className="gap-2"
          >
            <GitMerge className="w-4 h-4" />
            Merge
          </Button>
          <Link href={`/contacts/${contact.id}/edit`}>
            <Button variant="outline">Edit Contact</Button>
          </Link>
        </div>
      </div>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contact.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              </div>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
              </div>
            </div>
          )}
          {contact.notes && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 pt-2 border-t">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(contact.created_at), "PPP")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContactHistory contactId={contactId} />

        {/* Linked Reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Linked Reminders</CardTitle>
              <CardDescription>
                {reminders.length} reminder{reminders.length !== 1 ? "s" : ""} linked to this contact
              </CardDescription>
            </div>
            <Link href={`/reminder/create?contact_id=${contact.id}`}>
              <Button className="gap-2" size="sm">
                <Plus className="w-4 h-4" />
                New Reminder
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No reminders linked to this contact</p>
                <Link href={`/reminder/create?contact_id=${contact.id}`}>
                  <Button>Create Reminder</Button>
                </Link>
              </div>
            ) : (
              <RemindersTable reminders={reminders} onReminderDeleted={fetchContact} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Merge Dialog */}
      <AlertDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Contacts</AlertDialogTitle>
            <AlertDialogDescription>
              Select a contact to merge with <strong>{contact.name}</strong>. All reminders and
              activity from the selected contact will be moved to this contact, and the selected
              contact will be archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedContactId} onValueChange={setSelectedContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a contact to merge with" />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.length === 0 ? (
                  <SelectItem value="" disabled>
                    No contacts available to merge
                  </SelectItem>
                ) : (
                  availableContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.email && `(${c.email})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMerge}
              disabled={isMerging || !selectedContactId}
            >
              {isMerging ? "Merging..." : "Merge Contacts"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

