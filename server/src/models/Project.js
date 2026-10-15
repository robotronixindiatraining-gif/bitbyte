import mongoose from 'mongoose';
import { contentSchema } from '@bitbyte/shared';
import { publishable } from './plugins/publishable.js';

const { Schema } = mongoose;

const projectSchema = new Schema(
  {
    slug: { type: String, required: true, maxlength: 80, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    /** Client permission to show the work; required to publish (CG-07b). */
    permission: {
      type: new Schema(
        {
          confirmed: { type: Boolean, default: false },
          confirmedAt: { type: Date, default: null },
          confirmedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
          note: { type: String, maxlength: 500, default: '' },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  { timestamps: true },
);
projectSchema.plugin(publishable, { schemaFor: (_doc, mode) => contentSchema('project', mode) });
projectSchema.index({ slug: 1 }, { unique: true });
projectSchema.index({ 'draft.slug': 1 }, { sparse: true });
projectSchema.index({ 'published.category': 1, status: 1 });
projectSchema.index({ 'published.featured': 1 });

export const Project = mongoose.models.Project ?? mongoose.model('Project', projectSchema);
