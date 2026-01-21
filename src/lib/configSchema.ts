import { z } from 'zod';

// Valid URL schema with additional security checks
export const webhookUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Must be a valid URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Only allow HTTPS in production (or HTTP for localhost)
        return (
          parsed.protocol === 'https:' ||
          (parsed.protocol === 'http:' && 
           (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'))
        );
      } catch {
        return false;
      }
    },
    { message: 'URL must use HTTPS (or HTTP for localhost only)' }
  )
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Prevent dangerous protocols
        return !['javascript:', 'data:', 'file:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Invalid URL protocol' }
  );

export const configSchema = z.object({
  submitWebhookUrl: webhookUrlSchema.or(z.literal('')),
  readWebhookUrl: webhookUrlSchema.or(z.literal('')),
  adminPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export type AppConfig = z.infer<typeof configSchema>;

