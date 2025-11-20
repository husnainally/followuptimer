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

const privacySettingsSchema = z.object({
  dataCollection: z.boolean().default(false),
  marketingEmails: z.boolean().default(false),
})

export function PrivacySettings() {
  const [saveSuccess, setSaveSuccess] = useState(false)

  const form = useForm({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: {
      dataCollection: false,
      marketingEmails: false,
    },
  })

  const onSubmit = (data: z.infer<typeof privacySettingsSchema>) => {
    console.log("Privacy settings:", data)
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
              name="dataCollection"
              label="Data Collection"
              description="Allow us to collect usage analytics to improve the app"
            />
            <ControlledSwitch
              control={form.control}
              name="marketingEmails"
              label="Marketing Communications"
              description="Receive updates about new features and improvements"
            />
            <div className="flex justify-end pt-4">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm text-primary mr-4">
                  <Check className="w-4 h-4" />
                  <span>Saved successfully</span>
                </div>
              )}
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
