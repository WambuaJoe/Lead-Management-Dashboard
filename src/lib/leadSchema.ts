import { z } from 'zod';

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .max(30, 'Phone number must be less than 30 characters')
    .regex(/^[+\d\s\-()]+$/, 'Please enter a valid phone number'),
  company: z
    .string()
    .trim()
    .min(1, 'Company is required')
    .max(200, 'Company name must be less than 200 characters'),
});

export type LeadFormData = z.infer<typeof leadSchema>;
