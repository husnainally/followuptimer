"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  AlertCircle,
  Calendar,
  Shield,
  CheckCircle2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  count: number;
  description?: string;
  icon: LucideIcon;
  href?: string;
  variant?: "default" | "warning" | "success" | "info";
  onClick?: () => void;
}

export function DashboardCard({
  title,
  count,
  description,
  icon: Icon,
  href,
  variant = "default",
  onClick,
}: DashboardCardProps) {
  const variantStyles = {
    default: "border-border/80 bg-card hover:bg-muted/20",
    warning: "border-amber-200 bg-amber-50/50 hover:bg-amber-50",
    success: "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50",
    info: "border-blue-200 bg-blue-50/50 hover:bg-blue-50",
  };

  const ariaLabel = description
    ? `${title}: ${count} ${description}`
    : `${title}: ${count}`;

  const content = (
    <Card
      className={cn(
        "relative overflow-hidden transition-all cursor-pointer group",
        variantStyles[variant]
      )}
      onClick={onClick}
      role={href || onClick ? "button" : undefined}
      aria-label={href || onClick ? ariaLabel : undefined}
      tabIndex={href || onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if ((href || onClick) && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          if (onClick) {
            onClick();
          } else if (href) {
            window.location.href = href;
          }
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-xl",
                variant === "default" && "bg-muted/40 text-primary",
                variant === "warning" && "bg-amber-100 text-amber-700",
                variant === "success" && "bg-emerald-100 text-emerald-700",
                variant === "info" && "bg-blue-100 text-blue-700"
              )}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {title}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-2xl font-semibold",
                variant === "default" && "text-foreground",
                variant === "warning" && "text-amber-700",
                variant === "success" && "text-emerald-700",
                variant === "info" && "text-blue-700"
              )}
              aria-label={`${count} items`}
            >
              {count}
            </span>
            {(href || onClick) && (
              <ChevronRight
                className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    // Add query parameter for overdue tab
    const finalHref = title === "Overdue" ? `${href}?tab=overdue` : href;
    return (
      <Link href={finalHref} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return content;
}

interface TrustIndicatorProps {
  suppressedThisWeek: number;
  quietHoursSuppressions: number;
  failedReminders: number;
  allProcessedNormally: boolean;
}

export function TrustIndicators({
  suppressedThisWeek,
  quietHoursSuppressions,
  failedReminders,
  allProcessedNormally,
}: TrustIndicatorProps) {
  if (allProcessedNormally && suppressedThisWeek === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span>All reminders processed normally</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suppressedThisWeek > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Suppressed this week:{" "}
            <span className="font-medium text-foreground">
              {suppressedThisWeek}
            </span>
            {quietHoursSuppressions > 0 && (
              <span className="text-muted-foreground ml-1">
                ({quietHoursSuppressions} quiet hours)
              </span>
            )}
          </span>
        </div>
      )}
      {failedReminders > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertCircle className="h-4 w-4" />
          <span>
            {failedReminders} failed reminder{failedReminders !== 1 ? "s" : ""}{" "}
            this week
          </span>
        </div>
      )}
    </div>
  );
}

interface WeeklyDigestPreviewProps {
  nextDigestTime: string | null;
  enabled: boolean;
}

export function WeeklyDigestPreview({
  nextDigestTime,
  enabled,
}: WeeklyDigestPreviewProps) {
  if (!enabled) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Weekly digest disabled</span>
      </div>
    );
  }

  if (!nextDigestTime) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Next digest: Not scheduled</span>
      </div>
    );
  }

  try {
    const nextDigest = new Date(nextDigestTime);
    const dayName = format(nextDigest, "EEEE");
    const time = format(nextDigest, "h:mm a");

    return (
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          Next digest:{" "}
          <span className="font-medium text-foreground">
            {dayName} {time}
          </span>
        </span>
      </div>
    );
  } catch {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Next digest: {nextDigestTime}</span>
      </div>
    );
  }
}

