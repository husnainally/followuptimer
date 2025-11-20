"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function AccountSettings() {
  return (
    <Card className="">
      <CardHeader>
        <CardTitle className="text-destructive">Account & Danger Zone</CardTitle>
        <CardDescription>Irreversible actions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
          <div>
            <p className="font-medium text-foreground">Delete Account</p>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
          </div>
          <Button variant="destructive" className="bg-destructive hover:bg-destructive/90">
            Delete Account
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
