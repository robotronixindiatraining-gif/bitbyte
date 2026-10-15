import mongoose from 'mongoose';
import { contentSchema } from '@bitbyte/shared';
import { publishable } from './plugins/publishable.js';

export const ORDERING_KEYS = Object.freeze([
  'services',
  'projects',
  'testimonials',
  'jobOpenings',
  'projectCategories',
]);

/** Draft/published order of listings: reordering goes live only on publish (D-037). */
const orderingSchema = new mongoose.Schema(
  { key: { type: String, enum: ORDERING_KEYS, required: true } },
  { timestamps: true },
);
orderingSchema.plugin(publishable, { schemaFor: (_doc, mode) => contentSchema('ordering', mode) });
orderingSchema.index({ key: 1 }, { unique: true });

export const Ordering = mongoose.models.Ordering ?? mongoose.model('Ordering', orderingSchema);
