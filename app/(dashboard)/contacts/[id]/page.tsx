"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, FileText, Plus, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { RemindersTable } from "@/app/(dashboard)/reminders-table";
import { format } from "date-fns";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
        <Link href={`/contacts/${contact.id}/edit`}>
          <Button variant="outline">Edit Contact</Button>
        </Link>
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
            <Button className="gap-2">
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
  );
}

