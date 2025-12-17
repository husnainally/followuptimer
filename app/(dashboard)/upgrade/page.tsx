"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

export default function UpgradePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Upgrade to Premium</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Unlock advanced features and priority support
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pro Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>For power users</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$9</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">Unlimited reminders</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">Advanced analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">Custom affirmations</span>
              </li>
            </ul>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise Plan */}
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Enterprise</CardTitle>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                Popular
              </span>
            </div>
            <CardDescription>For teams and businesses</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">Everything in Pro</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">Team collaboration</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">API access</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">Dedicated support</span>
              </li>
            </ul>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Note */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-center text-muted-foreground">
            Payment processing will be available in Phase 3. This page is a placeholder for future implementation.
          </p>
        </CardContent>
      </Card>

      {/* Back Link */}
      <div className="text-center">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

