import { z } from 'zod';

const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Login Schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Signup Schema
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

// Reset Password Schema
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Waitlist Schema
export const waitlistSchema = z.object({
  email: emailSchema,
});

export type WaitlistFormData = z.infer<typeof waitlistSchema>;

// Onboarding Schemas

// Tone Selection Schema
export const toneSchema = z.object({
  tone: z.enum(['motivational', 'professional', 'playful'], {
    message: 'Please select a tone',
  }),
});

export type ToneFormData = z.infer<typeof toneSchema>;

// Notifications Schema
export const notificationsSchema = z.object({
  pushEnabled: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
});

export type NotificationsFormData = z.infer<typeof notificationsSchema>;

// Reminder Schema
export const reminderSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(500, 'Message too long'),
  remind_at: z
    .date()
    .refine((date) => date > new Date(), 'Reminder time must be in the future'),
  tone: z.enum(['motivational', 'professional', 'playful', 'simple'], {
    message: 'Please select a tone',
  }),
  notification_method: z.enum(['email', 'push', 'in_app'], {
    message: 'Please select a notification method',
  }),
  affirmation_enabled: z.boolean().optional().default(true),
});

export type ReminderFormData = z.infer<typeof reminderSchema>;
