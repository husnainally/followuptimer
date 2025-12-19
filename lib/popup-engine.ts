import { createServiceClient } from "@/lib/supabase/service";
import { type EventType } from "@/lib/events";
import { getAffirmationForUser } from "@/lib/affirmation-engine";

export type PopupActionType =
  | "FOLLOW_UP_NOW"
  | "SNOOZE"
  | "MARK_DONE"
  | "DISMISS";

type PopupInstanceStatus =
  | "queued"
  | "displayed"
  | "dismissed"
  | "acted"
  // Backward compatible statuses
  | "pending"
  | "shown"
  | "action_taken"
  | "expired";

export type PopupTemplateKey =
  | "email_opened"
  | "reminder_due"
  | "reminder_completed"
  | "no_reply_after_n_days";

export interface PopupRuleRow {
  id: string;
  user_id: string;
  rule_name: string;
  trigger_event_type: EventType;
  conditions: Record<string, unknown>;
  template_key: PopupTemplateKey;
  priority: number;
  cooldown_seconds: number;
  max_per_day: number | null;
  ttl_seconds: number;
  enabled: boolean;
}

export interface CreatePopupFromEventInput {
  userId: string;
  eventId: string;
  eventType: EventType;
  eventCreatedAt?: string; // ISO
  eventData: Record<string, unknown>;
  contactId?: string;
  reminderId?: string;
}

function isTriggerEventType(eventType: EventType): boolean {
  return (
    eventType === "email_opened" ||
    eventType === "reminder_due" ||
    eventType === "reminder_completed" ||
    eventType === "no_reply_after_n_days"
  );
}

function safeString(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim().length > 0) return v;
  return fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function startOfDayUtc(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
}

function buildTemplatePayload(args: {
  templateKey: PopupTemplateKey;
  eventType: EventType;
  eventId: string;
  eventCreatedAt?: string;
  eventData: Record<string, unknown>;
  contactId?: string;
  reminderId?: string;
}): { title: string; message: string; payload: Record<string, unknown> } {
  const contactName =
    safeString(args.eventData.contact_name, "") ||
    safeString(args.eventData.name, "") ||
    safeString(args.eventData.contact, "") ||
    "this contact";

  const threadLink =
    safeString(args.eventData.threadLink, "") ||
    safeString(args.eventData.thread_link, "") ||
    safeString(args.eventData.thread_url, "") ||
    safeString(args.eventData.action_url, "");

  const basePayload: Record<string, unknown> = {
    template_key: args.templateKey,
    source_event_id: args.eventId,
    source_event_type: args.eventType,
    source_event_created_at: args.eventCreatedAt || null,
    contact_id: args.contactId || null,
    reminder_id: args.reminderId || null,
    contact_name: contactName,
    thread_link: threadLink || null,
  };

  switch (args.templateKey) {
    case "email_opened": {
      // Calculate time since email was opened
      const eventTime = args.eventCreatedAt ? new Date(args.eventCreatedAt) : new Date();
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
      
      let timeAgo: string;
      if (minutesAgo < 1) {
        timeAgo = "just now";
      } else if (minutesAgo < 60) {
        timeAgo = `${minutesAgo} ${minutesAgo === 1 ? "minute" : "minutes"} ago`;
      } else if (minutesAgo < 1440) {
        const hoursAgo = Math.floor(minutesAgo / 60);
        timeAgo = `${hoursAgo} ${hoursAgo === 1 ? "hour" : "hours"} ago`;
      } else {
        const daysAgo = Math.floor(minutesAgo / 1440);
        timeAgo = `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
      }
      
      return {
        title: "Email opened",
        message: `Your email to ${contactName} was opened ${timeAgo}.`,
        payload: basePayload,
      };
    }
    case "reminder_due":
      return {
        title: "Follow-up due",
        message: `Follow-up due: ${contactName}.`,
        payload: basePayload,
      };
    case "reminder_completed": {
      const reminderMessage = safeString(args.eventData.message, "");
      const messagePreview =
        reminderMessage.length > 50
          ? reminderMessage.substring(0, 50) + "..."
          : reminderMessage;
      const contactPart =
        contactName !== "this contact" ? ` to ${contactName}` : "";
      return {
        title: "Reminder sent",
        message: `Your reminder${contactPart} has been sent.${
          reminderMessage ? ` "${messagePreview}"` : ""
        }`,
        payload: basePayload,
      };
    }
    case "no_reply_after_n_days": {
      const days =
        typeof args.eventData.days === "number" ? args.eventData.days : null;
      const suffix = days ? ` after ${days} days` : "";
      return {
        title: "No reply yet",
        message: `No reply yet${suffix} — want to follow up?`,
        payload: basePayload,
      };
    }
  }
}

async function ensureDefaultPopupRules(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from("popup_rules")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) return;

  // Defaults tuned to be calm (anti-spam) and match MVP templates
  const defaults = [
    {
      user_id: userId,
      rule_name: "Email opened popup",
      trigger_event_type: "email_opened",
      template_key: "email_opened",
      priority: 9,
      cooldown_seconds: 60 * 30,
      max_per_day: 6,
      ttl_seconds: 60 * 60 * 24,
      enabled: true,
      conditions: { require_contact_id: false },
    },
    {
      user_id: userId,
      rule_name: "Reminder due popup",
      trigger_event_type: "reminder_due",
      template_key: "reminder_due",
      priority: 8,
      cooldown_seconds: 60 * 15,
      max_per_day: 10,
      ttl_seconds: 60 * 60 * 24,
      enabled: true,
      conditions: { require_reminder_id: true },
    },
    {
      user_id: userId,
      rule_name: "Reminder completed popup",
      trigger_event_type: "reminder_completed",
      template_key: "reminder_completed",
      priority: 7,
      cooldown_seconds: 60 * 5,
      max_per_day: 20,
      ttl_seconds: 60 * 60 * 24,
      enabled: true,
      conditions: { require_reminder_id: true },
    },
    {
      user_id: userId,
      rule_name: "No reply after N days popup",
      trigger_event_type: "no_reply_after_n_days",
      template_key: "no_reply_after_n_days",
      priority: 7,
      cooldown_seconds: 60 * 60 * 12,
      max_per_day: 6,
      ttl_seconds: 60 * 60 * 24,
      enabled: true,
      conditions: { require_contact_id: true },
    },
  ];

  const { error: insertError } = await supabase
    .from("popup_rules")
    .insert(defaults);
  if (insertError) throw insertError;
}

async function passesEligibility(args: {
  userId: string;
  rule: PopupRuleRow;
  sourceEventId: string;
  contactId?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createServiceClient();

  // Feature enabled / plan checks (MVP: require active plan_status; otherwise allow)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_status, in_app_notifications")
    .eq("id", args.userId)
    .single();

  if (
    profile?.plan_status &&
    profile.plan_status !== "active" &&
    profile.plan_status !== "trial"
  ) {
    return { ok: false, reason: "plan_inactive" };
  }

  // User preference check: if they explicitly disabled in-app notifications, treat as popups disabled
  if (profile?.in_app_notifications === false) {
    return { ok: false, reason: "popups_disabled" };
  }

  const conditions = (args.rule.conditions || {}) as Record<string, unknown>;
  if (conditions.require_contact_id === true && !args.contactId) {
    return { ok: false, reason: "missing_contact_id" };
  }

  // Dedupe is enforced by DB unique index on (user_id, source_event_id), but we also short-circuit.
  const { data: existing } = await supabase
    .from("popups")
    .select("id")
    .eq("user_id", args.userId)
    .eq("source_event_id", args.sourceEventId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { ok: false, reason: "dedupe_source_event" };
  }

  // Global cooldown: from last displayed/shown popup within N seconds (default 60s)
  const globalCooldownSeconds =
    typeof conditions.global_cooldown_seconds === "number"
      ? (conditions.global_cooldown_seconds as number)
      : 60;
  if (globalCooldownSeconds > 0) {
    const cutoff = new Date(
      Date.now() - globalCooldownSeconds * 1000
    ).toISOString();
    const { data: recent } = await supabase
      .from("popups")
      .select("id")
      .eq("user_id", args.userId)
      .in("status", ["displayed", "shown"])
      .gte("displayed_at", cutoff)
      .limit(1);
    if (recent && recent.length > 0)
      return { ok: false, reason: "global_cooldown" };
  }

  // Per-rule cooldown
  const perRuleCooldown = Math.max(0, args.rule.cooldown_seconds || 0);
  if (perRuleCooldown > 0) {
    const cutoff = new Date(Date.now() - perRuleCooldown * 1000).toISOString();
    const { data: recent } = await supabase
      .from("popups")
      .select("id")
      .eq("user_id", args.userId)
      .eq("rule_id", args.rule.id)
      .in("status", [
        "displayed",
        "shown",
        "acted",
        "action_taken",
        "dismissed",
      ])
      .gte("displayed_at", cutoff)
      .limit(1);
    if (recent && recent.length > 0)
      return { ok: false, reason: "rule_cooldown" };
  }

  // Per-entity cap (per day)
  if (args.rule.max_per_day && args.rule.max_per_day > 0 && args.contactId) {
    const start = startOfDayUtc(new Date()).toISOString();
    const { count } = await supabase
      .from("popups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", args.userId)
      .eq("rule_id", args.rule.id)
      .eq("contact_id", args.contactId)
      .gte("queued_at", start);
    if ((count || 0) >= args.rule.max_per_day)
      return { ok: false, reason: "entity_cap" };
  }

  return { ok: true };
}

export async function createPopupsFromEvent(
  input: CreatePopupFromEventInput
): Promise<void> {
  if (!isTriggerEventType(input.eventType)) return;

  const supabase = createServiceClient();

  await ensureDefaultPopupRules(input.userId);

  const { data: rules, error: rulesError } = await supabase
    .from("popup_rules")
    .select(
      "id,user_id,rule_name,trigger_event_type,conditions,template_key,priority,cooldown_seconds,max_per_day,ttl_seconds,enabled"
    )
    .eq("user_id", input.userId)
    .eq("trigger_event_type", input.eventType)
    .eq("enabled", true)
    .order("priority", { ascending: false });

  if (rulesError) throw rulesError;
  if (!rules || rules.length === 0) return;

  // For MVP: create at most one instance per event (highest priority eligible rule wins)
  for (const rule of rules as unknown as PopupRuleRow[]) {
    const eligibility = await passesEligibility({
      userId: input.userId,
      rule,
      sourceEventId: input.eventId,
      contactId: input.contactId,
    });
    if (!eligibility.ok) continue;

    const rendered = buildTemplatePayload({
      templateKey: rule.template_key,
      eventType: input.eventType,
      eventId: input.eventId,
      eventCreatedAt: input.eventCreatedAt,
      eventData: input.eventData,
      contactId: input.contactId,
      reminderId: input.reminderId,
    });

    // Get affirmation using new affirmation engine (will be set after popup creation)
    // We'll get it after popup is created so we can pass popup_id
    let affirmation: string | null = null;

    const expiresAt = new Date(
      Date.now() + Math.max(0, rule.ttl_seconds || 0) * 1000
    ).toISOString();

    const { data: insertedPopup, error: insertError } = await supabase
      .from("popups")
      .insert({
        user_id: input.userId,
        reminder_id: input.reminderId || null,
        contact_id: input.contactId || null,
        rule_id: rule.id,
        source_event_id: input.eventId,
        template_type: "success", // legacy enum; UI uses title/message/payload for MVP
        title: rendered.title,
        message: rendered.message,
        affirmation: null, // Will be set after getting affirmation
        priority: Math.max(1, Math.min(10, rule.priority || 5)),
        status: "queued" as PopupInstanceStatus,
        queued_at: nowIso(),
        expires_at: expiresAt,
        payload: rendered.payload,
      })
      .select("id")
      .single();

    // If insert fails due to dedupe unique constraint, silently ignore.
    if (insertError) {
      const msg = insertError.message || "";
      if (
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("unique")
      ) {
        return;
      }
      throw insertError;
    }

    // Get affirmation using new affirmation engine (after popup is created so we can pass popup_id)
    if (insertedPopup) {
      const affirmationResult = await getAffirmationForUser(
        input.userId,
        {
          popupType: rule.template_key,
          eventType: input.eventType,
          reminderId: input.reminderId,
          contactId: input.contactId,
        },
        insertedPopup.id
      );

      // Update popup with affirmation if one was selected
      if (affirmationResult) {
        await supabase
          .from("popups")
          .update({ affirmation: affirmationResult.text })
          .eq("id", insertedPopup.id);
      }
    }

    return;
  }
}
