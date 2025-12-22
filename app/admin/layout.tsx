"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AdminNav } from "@/components/admin/admin-nav";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to access this page");
        router.push("/login");
        return;
      }

      // Check if user is admin
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (error || !profile?.is_admin) {
        toast.error("Access denied. Admin privileges required.");
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error: any) {
      toast.error("Failed to verify admin access");
      router.push("/dashboard");
    } finally {
      setCheckingAuth(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen">
        <div className="w-[200px] border-r border-border p-4">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

