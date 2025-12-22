"use client";

import { useState } from "react";
import { ProfileSettings } from "./profile-settings";
import { NotificationSettings } from "./notification-settings";
import { PrivacySettings } from "./privacy-settings";
import { AccountSettings } from "./account-settings";
import { AffirmationSettings } from "./affirmation-settings";
import { SnoozeSettings } from "./snooze-settings";
import { DigestSettings } from "./digest-settings";
import { ToneSettings } from "./tone-settings";
import { BehaviourSettings } from "./behaviour-settings";
import { ResetSettings } from "./reset-settings";
import {
  User,
  Bell,
  Lock,
  Trash2,
  Sparkles,
  Clock,
  Mail,
  Palette,
  Settings2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsSection =
  | "profile"
  | "tone"
  | "notifications"
  | "behaviour"
  | "affirmations"
  | "snooze"
  | "digest"
  | "privacy"
  | "reset"
  | "account";

const settingsMenuItems: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "tone", label: "Tone", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "behaviour", label: "Behaviour", icon: Settings2 },
  { id: "affirmations", label: "Affirmations", icon: Sparkles },
  { id: "snooze", label: "Snooze", icon: Clock },
  { id: "digest", label: "Digest", icon: Mail },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "reset", label: "Reset", icon: RotateCcw },
  { id: "account", label: "Account", icon: Trash2 },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSettings />;
      case "tone":
        return <ToneSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "behaviour":
        return <BehaviourSettings />;
      case "affirmations":
        return <AffirmationSettings />;
      case "snooze":
        return <SnoozeSettings />;
      case "digest":
        return <DigestSettings />;
      case "privacy":
        return <PrivacySettings />;
      case "reset":
        return <ResetSettings />;
      case "account":
        return <AccountSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0">
        <nav className="sticky top-4 space-y-1">
          <div className="space-y-1 border rounded-lg p-2 bg-white">
            {settingsMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="max-w-4xl">{renderContent()}</div>
      </div>
    </div>
  );
}
