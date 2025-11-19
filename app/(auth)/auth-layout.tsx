"use client";

import Image from "next/image";
import { useMemo, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-mobile";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  sideEyebrow?: string;
  sideTitle?: ReactNode;
  sideSubtitle?: string;
  sideQuote?: string;
  sideQuoteAuthor?: string;
  sideQuoteRole?: string;
}

export function AuthLayout({
  children,
  title,
  description,
  sideEyebrow,
  sideTitle,
  sideSubtitle,
  sideQuote,
  sideQuoteAuthor,
  sideQuoteRole,
}: AuthLayoutProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const defaultSideTitle = useMemo(
    () => (
      <>
        Never Miss a <span className="italic font-semibold">Reminder</span>
      </>
    ),
    []
  );

  const resolvedSideTitle = sideTitle ?? defaultSideTitle;
  const resolvedSideSubtitle =
    sideSubtitle ??
    "Set timely reminders and stay on track with your important tasks and follow-ups.";
  const resolvedSideQuote =
    sideQuote ??
    `"The reminders keep me on schedule and make sure nothing slips through the cracks."`;
  const resolvedSideQuoteAuthor = sideQuoteAuthor ?? "Priya Menon";
  const resolvedSideQuoteRole = sideQuoteRole ?? "Customer Support Lead";

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="space-y-4 mb-8 text-center">
            <div className="flex justify-center">
              <Image
                src="/logo1.png"
                alt="FollowUpTimer logo"
                width={200}
                height={200}
                priority
              />
            </div>
            {title && (
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-balance">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            )}
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-1/2  p-10 ">
        <div className="p-5 rounded-3xl h-full relative hidden md:flex flex-col justify-between bg-primary text-primary-foreground  overflow-hidden">

          <div className="relative space-y-2 max-w-md">
          {sideEyebrow && (
            <p className="text-sm uppercase tracking-[0.3em] text-primary-foreground/70">
              {sideEyebrow}
            </p>
          )}
            <h2 className="text-4xl md:text-5xl  font-semibold leading-tight">
              {resolvedSideTitle}
            </h2>
            <p className="text-lg text-primary-foreground/80">
              {resolvedSideSubtitle}
            </p>
          </div>
          <div className="relative mt-10 rounded-3xl bg-primary-foreground/10 p-6 shadow-2xl max-w-sm border border-primary-foreground/20 backdrop-blur">
            <p className="text-base leading-relaxed text-primary-foreground/90">
              {resolvedSideQuote}
            </p>
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <img
                  src="/cs1.jpg"
                  alt={resolvedSideQuoteAuthor}
                  className="w-10 h-10 rounded-full object-cover border border-primary-foreground/30"
                />
                <div>
                  <p className="font-semibold">{resolvedSideQuoteAuthor}</p>
                  <p className="text-sm text-primary-foreground/70">
                    {resolvedSideQuoteRole}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center w-1/2">
        <div className="w-full max-w-md">
          <div className="space-y-4 mb-8 text-center">
            <div className="flex justify-center">
              <Image
                src="/logo1.png"
                alt="FollowUpTimer logo"
                width={200}
                height={200}
                priority
              />
            </div>
            {title && (
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-balance">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
