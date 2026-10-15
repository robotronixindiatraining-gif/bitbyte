import { z } from 'zod';
import { emailSchema, slugSchema } from './validation.js';

/** Lead statuses (docs/DATABASE_SCHEMA.md §3.11). `new` = unread. */
export const LEAD_STATUSES = Object.freeze([
  'new',
  'contacted',
  'in_discussion',
  'won',
  'lost',
  'spam',
]);

// eslint-disable-next-line no-control-regex
const SINGLE_LINE = /^[^\u0000-\u001f\u007f]*$/;
// eslint-disable-next-line no-control-regex
const MULTI_LINE = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;

/** Trimmed text with collapsed inner whitespace; control characters are rejected. */
const text = (min, max) =>
  z
    .string()
    .trim()
    .regex(SINGLE_LINE, 'Contains invalid characters')
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(min, min > 0 ? 'Required' : undefined)
        .max(max, `Must be at most ${max} characters`),
    );

/**
 * Public contact-form submission. The fields mirror the indexed contact form (inventory P13a)
 * and are PROVISIONAL until the original site is verified (CONTENT_GAPS CG-20).
 * `website` is a honeypot (must stay empty); `formStartedAt` measures fill time.
 */
export const leadSubmissionSchema = z
  .object({
    type: z.literal('project_enquiry'),
    fullName: text(1, 100),
    companyName: text(1, 120),
    companyLocation: text(1, 120),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9 ()-]{5,18}[0-9]$/, 'Enter a valid phone number')
      .transform((value) => value.replace(/\s+/g, ' ')),
    budget: text(1, 60),
    message: z
      .string()
      .trim()
      .regex(MULTI_LINE, 'Contains invalid characters')
      .transform((value) => value.replace(/\r\n?/g, '\n'))
      .pipe(z.string().min(10, 'Please write at least 10 characters').max(5000)),
    service: slugSchema.optional(),
    consent: z.literal(true, { message: 'Consent is required' }),
    sourcePath: z
      .string()
      .max(300)
      .regex(/^\/[^\s]*$/, 'Must be a site path')
      .optional(),
    utm: z
      .object({
        source: z.string().max(100).optional(),
        medium: z.string().max(100).optional(),
        campaign: z.string().max(100).optional(),
        term: z.string().max(100).optional(),
        content: z.string().max(100).optional(),
      })
      .strict()
      .optional(),
    website: z.string().max(200).optional(),
    formStartedAt: z.number().int().positive().optional(),
    turnstileToken: z.string().min(1, 'Bot check missing').max(2048),
  })
  .strict();
