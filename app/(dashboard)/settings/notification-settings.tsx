"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { ControlledSwitch } from "@/components/controlled-switch"
import { Check } from "lucide-react"

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  reminderAlerts: z.boolean().default(true),
  weeklyDigest: z.boolean().default(false),
})

export function NotificationSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false)

  const form = useForm({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      reminderAlerts: true,
      weeklyDigest: false,
    },
  })

  const onSubmit = (data: z.infer<typeof notificationSettingsSchema>) => {
    console.log("Notification settings:", data)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <Card className="">
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ControlledSwitch
              control={form.control}
              name="emailNotifications"
              label="Email Notifications"
              description="Receive affirmation reminders via email"
            />
            <ControlledSwitch
              control={form.control}
              name="pushNotifications"
              label="Push Notifications"
              description="Receive push notifications on your devices"
            />
            <ControlledSwitch
              control={form.control}
              name="reminderAlerts"
              label="Reminder Alerts"
              description="Get alerted when a reminder is due"
            />
            <ControlledSwitch
              control={form.control}
              name="weeklyDigest"
              label="Weekly Digest"
              description="Receive a weekly summary of your activity"
            />
            <div className="flex justify-end pt-4">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm text-primary mr-4">
                  <Check className="w-4 h-4" />
                  <span>Saved successfully</span>
                </div>
              )}
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Save Preferences
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
