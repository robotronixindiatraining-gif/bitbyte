import mongoose from 'mongoose';
import { PAGE_TEMPLATE_NAMES, contentSchema } from '@bitbyte/shared';
import { publishable } from './plugins/publishable.js';

const pageSchema = new mongoose.Schema(
  {
    /** Live slug ('' = homepage). Custom pages share the top-level namespace with services (D-038). */
    slug: { type: String, default: '', maxlength: 80, match: /^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    template: { type: String, enum: PAGE_TEMPLATE_NAMES, required: true },
    /** System pages cannot be deleted and their slug is locked. */
    system: { type: Boolean, default: false },
  },
  { timestamps: true },
);
pageSchema.plugin(publishable, { schemaFor: (_doc, mode) => contentSchema('page', mode) });
pageSchema.index({ slug: 1 }, { unique: true });
pageSchema.index({ 'draft.slug': 1 }, { sparse: true });

export const Page = mongoose.models.Page ?? mongoose.model('Page', pageSchema);
