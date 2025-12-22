"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileSettings } from "./profile-settings"
import { NotificationSettings } from "./notification-settings"
import { PrivacySettings } from "./privacy-settings"
import { AccountSettings } from "./account-settings"
import { AffirmationSettings } from "./affirmation-settings"
import { SnoozeSettings } from "./snooze-settings"
import { DigestSettings } from "./digest-settings"
import { User, Bell, Lock, Trash2, Sparkles, Clock, Mail } from "lucide-react"


export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      
      {/* Tabs Navigation */}
      <Tabs defaultValue="profile" className="w-full ">
        <TabsList className="grid w-full grid-cols-7  border bg-white">
          <TabsTrigger value="profile" className="flex gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="affirmations" className="flex gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Affirmations</span>
          </TabsTrigger>
          <TabsTrigger value="snooze" className="flex gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Snooze</span>
          </TabsTrigger>
          <TabsTrigger value="digest" className="flex gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Digest</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex gap-2">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="affirmations" className="mt-6">
          <AffirmationSettings />
        </TabsContent>

        <TabsContent value="snooze" className="mt-6">
          <SnoozeSettings />
        </TabsContent>

        <TabsContent value="digest" className="mt-6">
          <DigestSettings />
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <PrivacySettings />
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
