"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  iconEmoji?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  iconEmoji,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const iconContent = Icon ? (
    <Icon className="h-12 w-12 text-muted-foreground" />
  ) : iconEmoji ? (
    <span className="text-4xl">{iconEmoji}</span>
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className
      )}
    >
      {iconContent && (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          {iconContent}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </div>
      {action && (
        <div className="mt-2">
          {action.href ? (
            <Button asChild>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}

