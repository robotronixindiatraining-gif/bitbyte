import mongoose from 'mongoose';
import { contentSchema } from '@bitbyte/shared';
import { publishable } from './plugins/publishable.js';

const serviceSchema = new mongoose.Schema(
  {
    /** Live slug; service pages are served at the top level, e.g. /cms-development (D-038). */
    slug: { type: String, required: true, maxlength: 80, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  },
  { timestamps: true },
);
serviceSchema.plugin(publishable, { schemaFor: (_doc, mode) => contentSchema('service', mode) });
serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ 'draft.slug': 1 }, { sparse: true });

export const Service = mongoose.models.Service ?? mongoose.model('Service', serviceSchema);
