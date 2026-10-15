import { z } from 'zod';
import { objectIdSchema } from '../validation.js';
import { UNSAFE_SCHEME } from './kit.js';

export const LINK_ENTITY_KINDS = Object.freeze(['page', 'service', 'project', 'job']);

/** SEO metadata (docs/DATABASE_SCHEMA.md §2.2). */
export function seoSchema(k) {
  return k.object({
    title: k.opt(z.string().max(70)),
    description: k.opt(z.string().max(170)),
    canonicalPath: k.opt(
      z
        .string()
        .regex(/^\/[a-z0-9/-]*$/, 'Must be a site path such as /about')
        .nullable(),
    ),
    ogImage: k.opt(objectIdSchema.nullable()),
    noindex: k.opt(z.boolean()),
  });
}

/** Link to a page/entity (resolved by id at render time) or a URL. */
export function linkSchema(k) {
  return k
    .object({
      label: k.req(k.text(60)),
      kind: k.req(z.enum(['internal', 'external', 'entity'])),
      href: k.opt(z.string().max(2048)),
      entity: k.opt(
        z
          .object({ kind: z.enum(LINK_ENTITY_KINDS), id: objectIdSchema })
          .strict()
          .nullable(),
      ),
      openInNewTab: k.opt(z.boolean()),
    })
    .superRefine((link, ctx) => {
      if (link.href && UNSAFE_SCHEME.test(link.href)) {
        ctx.addIssue({ code: 'custom', path: ['href'], message: 'Unsafe URL' });
      }
      if (!k.strict) return;
      if (link.kind === 'internal' && !/^\/(?!\/)/.test(link.href ?? '')) {
        ctx.addIssue({
          code: 'custom',
          path: ['href'],
          message: 'Must be a site path starting with /',
        });
      }
      if (link.kind === 'external' && !/^https?:\/\/[^\s]+$/i.test(link.href ?? '')) {
        ctx.addIssue({ code: 'custom', path: ['href'], message: 'Must be an http(s) URL' });
      }
      if (link.kind === 'entity' && !link.entity) {
        ctx.addIssue({
          code: 'custom',
          path: ['entity'],
          message: 'Choose a page or item to link to',
        });
      }
    });
}

/** Reference to a media document; alt text defaults to media.alt. */
export function imageRefSchema(k) {
  return k.object({
    media: k.req(objectIdSchema),
    altOverride: k.opt(z.string().max(250).nullable()),
  });
}
