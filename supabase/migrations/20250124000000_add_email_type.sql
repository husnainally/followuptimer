-- Email Type Distinction for Tracking
-- Add email_type column to sent_emails table to distinguish between:
-- 'reminder_to_self' - reminder email sent to user
-- 'follow_up_to_contact' - follow-up email sent to contact
-- 'digest' - weekly digest email
-- 'waitlist' - waitlist welcome email

-- Add email_type column
ALTER TABLE public.sent_emails
ADD COLUMN IF NOT EXISTS email_type text default 'reminder_to_self' not null;

-- Update existing reminder emails
UPDATE public.sent_emails
SET email_type = 'reminder_to_self'
WHERE reminder_id IS NOT NULL AND contact_id IS NULL;

-- Update existing contact follow-up emails
UPDATE public.sent_emails
SET email_type = 'follow_up_to_contact'
WHERE contact_id IS NOT NULL;

-- Create index for email_type filtering
CREATE INDEX IF NOT EXISTS sent_emails_email_type_idx ON public.sent_emails(email_type);

-- Add comment for documentation
COMMENT ON COLUMN public.sent_emails.email_type IS 'Type of email: reminder_to_self, follow_up_to_contact, digest, waitlist';
