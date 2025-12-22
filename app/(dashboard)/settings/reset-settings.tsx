"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";

export function ResetSettings() {
  const [resetting, setResetting] = useState<string | null>(null);

  async function resetSection(section: string) {
    setResetting(section);
    try {
      const response = await fetch(`/api/preferences/reset?section=${section}`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset settings");
      }

      toast.success(`Settings reset for ${section === "all" ? "all sections" : section}`);
      
      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset settings"
      );
    } finally {
      setResetting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>
          Reset settings to their default values. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Reset by Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!!resetting}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Tone
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Tone Settings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset your tone preference to "Neutral". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetSection("tone")}
                    disabled={resetting === "tone"}
                  >
                    {resetting === "tone" ? "Resetting..." : "Reset"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!!resetting}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Notifications
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Notification Settings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all notification preferences to defaults. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetSection("notifications")}
                    disabled={resetting === "notifications"}
                  >
                    {resetting === "notifications" ? "Resetting..." : "Reset"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!!resetting}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Behaviour
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Behaviour Settings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all behaviour controls to defaults. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetSection("behaviour")}
                    disabled={resetting === "behaviour"}
                  >
                    {resetting === "behaviour" ? "Resetting..." : "Reset"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Reset All Settings</h3>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={!!resetting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Reset All Settings
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Settings?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset ALL your preferences (tone, notifications, behaviour) to their default values. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetSection("all")}
                  disabled={resetting === "all"}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {resetting === "all" ? "Resetting..." : "Reset All"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

