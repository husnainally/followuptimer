"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield } from "lucide-react";
import Link from "next/link";

interface UpgradeCTAProps {
  variant?: "default" | "compact" | "inline";
  title?: string;
  description?: string;
}

export function UpgradeCTA({
  variant = "default",
  title,
  description,
}: UpgradeCTAProps) {
  const defaultTitle = "Unlock Premium Features";
  const defaultDescription =
    "Get access to advanced features, priority support, and more.";

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium">{title || defaultTitle}</p>
            <p className="text-xs text-muted-foreground">
              {description || defaultDescription}
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/upgrade">Upgrade</Link>
        </Button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{title || defaultTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {description || defaultDescription}
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/upgrade">Upgrade</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle>{title || defaultTitle}</CardTitle>
        </div>
        <CardDescription>{description || defaultDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Advanced Features</p>
              <p className="text-xs text-muted-foreground">
                Unlock all premium capabilities
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Priority Support</p>
              <p className="text-xs text-muted-foreground">
                Get help when you need it
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Exclusive Access</p>
              <p className="text-xs text-muted-foreground">
                Early access to new features
              </p>
            </div>
          </div>
        </div>
        <Button className="w-full" asChild>
          <Link href="/upgrade">Upgrade to Premium</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

