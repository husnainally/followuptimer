"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, Phone, FileText, Trash2, Pencil, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [archivedContacts, setArchivedContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    try {
      // Fetch active contacts
      const activeResponse = await fetch("/api/contacts");
      if (!activeResponse.ok) throw new Error("Failed to fetch contacts");
      const activeData = await activeResponse.json();
      setContacts(activeData.contacts || []);

      // Fetch archived contacts
      const archivedResponse = await fetch("/api/contacts?archived_only=true");
      if (archivedResponse.ok) {
        const archivedData = await archivedResponse.json();
        setArchivedContacts(archivedData.contacts || []);
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(contactId: string) {
    try {
      const response = await fetch(`/api/contacts/${contactId}/restore`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to restore contact");

      toast.success("Contact restored successfully");
      fetchContacts();
    } catch (error) {
      console.error("Failed to restore contact:", error);
      toast.error("Failed to restore contact");
    }
  }

  async function handleDelete(contact: Contact) {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!contactToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete contact");

      toast.success("Contact archived successfully");
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      fetchContacts();
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast.error("Failed to delete contact");
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your contacts and link them to reminders
          </p>
        </div>
        <Link href="/contacts/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Contact
          </Button>
        </Link>
      </div>

      {/* Contacts Grid */}
      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first contact to link reminders to people
            </p>
            <Link href="/contacts/create">
              <Button>Create Contact</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{contact.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/contacts/${contact.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(contact)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                      <FileText className="w-4 h-4 mt-0.5" />
                      <span className="line-clamp-2">{contact.notes}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Link href={`/contacts/${contact.id}`}>
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Archived Contacts Section */}
      {archivedContacts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Archived Contacts</h2>
              <p className="text-sm text-muted-foreground">
                {archivedContacts.length} archived contact
                {archivedContacts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Hide" : "Show"} Archived
            </Button>
          </div>

          {showArchived && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="hover:shadow-md transition-shadow opacity-75"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Archived
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRestore(contact.id)}
                      >
                        Restore
                      </Button>
                      <Link href={`/contacts/${contact.id}`}>
                        <Button variant="ghost" className="flex-1">
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {contactToDelete?.name}? This will hide the contact
              from your main list, but you can restore it later. All linked reminders will remain
              linked to this contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

