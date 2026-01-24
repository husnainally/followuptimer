/**
 * Resend Webhook Handler
 * Processes email events from Resend (email.opened, email.delivered, etc.)
 * Enables email open tracking for reminder emails
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/service';
import { logEvent } from '@/lib/events';
import { createPopupsFromEvent } from '@/lib/popup-engine';
import crypto from 'crypto';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Verify Resend webhook signature (Svix format)
 * Resend uses Svix for webhook delivery, which uses HMAC SHA256 with Base64 encoding
 *
 * Signature format:
 * - Headers: svix-id, svix-timestamp, svix-signature
 * - Signed content: {svix-id}.{svix-timestamp}.{raw_body}
 * - Secret format: whsec_<base64-key> (need to extract and decode the key part)
 */
async function verifyWebhookSignature(
  body: string,
  headers: Headers,
): Promise<boolean> {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn(
      '[Resend Webhook] RESEND_WEBHOOK_SECRET not configured - skipping verification',
    );
    // In production, this should be strict
    return process.env.NODE_ENV !== 'production';
  }

  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('[Resend Webhook] Missing required Svix headers:', {
      hasId: !!svixId,
      hasTimestamp: !!svixTimestamp,
      hasSignature: !!svixSignature,
    });
    return false;
  }

  try {
    // Step 1: Extract and decode the secret key
    // Secret format: whsec_<base64-key>
    let secretKey: Buffer;
    if (webhookSecret.startsWith('whsec_')) {
      const keyB64 = webhookSecret.substring(6); // Remove 'whsec_' prefix
      try {
        secretKey = Buffer.from(keyB64, 'base64');
        console.log(
          '[Resend Webhook] Using whsec_ format secret (decoded from base64)',
        );
      } catch (error) {
        console.error('[Resend Webhook] Failed to decode secret key:', error);
        return false;
      }
    } else {
      // Fallback: assume the secret is already the raw key (for backwards compatibility)
      console.warn(
        '[Resend Webhook] Secret does not start with whsec_ - using as raw UTF-8 key',
      );
      secretKey = Buffer.from(webhookSecret, 'utf8');
    }

    // Step 2: Construct signed content: {svix-id}.{svix-timestamp}.{raw_body}
    const signedContent = `${svixId}.${svixTimestamp}.${body}`;

    // Step 3: Compute HMAC-SHA256 and Base64 digest
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(signedContent, 'utf8');
    const expectedSignature = hmac.digest('base64');

    // Step 4: Compare with signatures in header (may contain multiple, space-separated)
    const signatures = svixSignature.split(' ');
    for (const sigWithVersion of signatures) {
      // Format: "v1,<base64-signature>"
      const parts = sigWithVersion.split(',');
      if (parts.length !== 2 || parts[0] !== 'v1') {
        continue;
      }

      const receivedSignature = parts[1];

      // Constant-time comparison to prevent timing attacks
      if (
        expectedSignature.length === receivedSignature.length &&
        crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(receivedSignature),
        )
      ) {
        // Step 5: Validate timestamp freshness (prevent replay attacks)
        const now = Math.floor(Date.now() / 1000);
        const timestamp = parseInt(svixTimestamp, 10);
        const age = Math.abs(now - timestamp);

        if (age > 300) {
          // More than 5 minutes old
          console.error('[Resend Webhook] Signature too old:', {
            age,
            timestamp,
            now,
          });
          return false;
        }

        return true;
      }
    }

    console.error(
      '[Resend Webhook] Signature verification failed - no matching signature',
      {
        expectedLength: expectedSignature.length,
        receivedSignatures: signatures.length,
        svixId: svixId.substring(0, 20) + '...',
        timestamp: svixTimestamp,
      },
    );
    return false;
  } catch (error) {
    console.error('[Resend Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Handle email.opened event
 */
async function handleEmailOpened(data: {
  email_id: string;
  created_at: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Find email metadata by resend_email_id
    const { data: sentEmail, error: lookupError } = await supabase
      .from('sent_emails')
      .select('*')
      .eq('resend_email_id', data.email_id)
      .single();

    if (lookupError || !sentEmail) {
      console.warn('[Resend Webhook] Email not found in sent_emails:', {
        emailId: data.email_id,
        error: lookupError,
      });
      return {
        success: false,
        error: 'Email not found in database',
      };
    }

    // Only track opens for follow-up emails sent to contacts
    // Skip reminders sent to the user themselves (reminder_to_self)
    if (sentEmail.email_type === 'reminder_to_self') {
      console.log(
        '[Resend Webhook] Skipping open tracking for reminder email:',
        {
          emailId: data.email_id,
          emailType: sentEmail.email_type,
        },
      );
      return {
        success: true,
        error: 'Reminder emails not tracked (user opened own reminder)',
      };
    }

    // Check if this is the first open (we only track first open)
    if (sentEmail.opened_at) {
      console.log('[Resend Webhook] Email already marked as opened:', {
        emailId: data.email_id,
        firstOpenedAt: sentEmail.opened_at,
      });
      return {
        success: true,
        error: 'Already tracked (first open only)',
      };
    }

    const openedAt = new Date(data.created_at);

    // Update sent_emails record
    const { error: updateError } = await supabase
      .from('sent_emails')
      .update({
        opened_at: openedAt.toISOString(),
        opened_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sentEmail.id);

    if (updateError) {
      console.error(
        '[Resend Webhook] Failed to update sent_emails:',
        updateError,
      );
      return {
        success: false,
        error: 'Failed to update database',
      };
    }

    console.log('[Resend Webhook] Email marked as opened:', {
      emailId: data.email_id,
      userId: sentEmail.user_id,
      contactId: sentEmail.contact_id,
      reminderId: sentEmail.reminder_id,
      openedAt,
    });

    // Update contact's last_interaction_at if contact is linked
    if (sentEmail.contact_id) {
      try {
        await supabase
          .from('contacts')
          .update({
            last_interaction_at: openedAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sentEmail.contact_id)
          .eq('user_id', sentEmail.user_id);

        console.log('[Resend Webhook] Updated contact last_interaction_at:', {
          contactId: sentEmail.contact_id,
          openedAt,
        });
      } catch (contactError) {
        // Don't fail webhook if contact update fails
        console.warn(
          '[Resend Webhook] Failed to update contact:',
          contactError,
        );
      }
    }

    // Fetch contact name for event data
    let contactName: string | undefined;
    if (sentEmail.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('name, first_name, last_name')
        .eq('id', sentEmail.contact_id)
        .single();

      if (contact) {
        contactName =
          contact.name ||
          `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
      }
    }

    // Log email_opened event
    const eventResult = await logEvent({
      userId: sentEmail.user_id,
      eventType: 'email_opened',
      eventData: {
        email_id: data.email_id,
        contact_name: contactName,
        recipient_email: sentEmail.recipient_email,
        opened_at: openedAt.toISOString(),
        reminder_id: sentEmail.reminder_id || undefined,
      },
      source: 'app',
      contactId: sentEmail.contact_id || undefined,
      reminderId: sentEmail.reminder_id || undefined,
      useServiceClient: true,
    });

    if (!eventResult.success) {
      console.error('[Resend Webhook] Failed to log event:', eventResult.error);
      // Don't fail webhook if event logging fails
    }

    // Create popup from email_opened event
    if (eventResult.success && eventResult.eventId) {
      try {
        await createPopupsFromEvent({
          userId: sentEmail.user_id,
          eventId: eventResult.eventId,
          eventType: 'email_opened',
          eventData: {
            contact_name: contactName,
            email_id: data.email_id,
            opened_at: openedAt.toISOString(),
          },
          eventCreatedAt: openedAt.toISOString(),
          contactId: sentEmail.contact_id || undefined,
          reminderId: sentEmail.reminder_id || undefined,
        });

        console.log('[Resend Webhook] Created popup for email_opened event');
      } catch (popupError) {
        // Don't fail webhook if popup creation fails
        console.warn('[Resend Webhook] Failed to create popup:', popupError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[Resend Webhook] Error handling email.opened:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * POST /api/webhooks/resend - Resend webhook endpoint
 */
export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const body = await request.text();

    // Verify webhook signature (Svix format)
    const isValid = await verifyWebhookSignature(body, headersList);
    if (!isValid) {
      console.error('[Resend Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventType = event.type;

    console.log('[Resend Webhook] Received event:', {
      type: eventType,
      emailId: event.data?.email_id,
    });

    // Handle different event types
    switch (eventType) {
      case 'email.opened':
        const result = await handleEmailOpened(event.data);
        if (!result.success) {
          console.warn(
            '[Resend Webhook] Failed to handle email.opened:',
            result.error,
          );
          // Return 200 anyway to prevent Resend from retrying
          // (we've already logged the error)
        }
        break;

      case 'email.delivered':
      case 'email.bounced':
      case 'email.complained':
        // Future: Handle other email events
        console.log('[Resend Webhook] Event type not handled:', eventType);
        break;

      default:
        console.log('[Resend Webhook] Unknown event type:', eventType);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Resend Webhook] Error processing webhook:', error);
    // Return 200 to prevent retries for malformed requests
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
