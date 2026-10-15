import mongoose from 'mongoose';
import { contentSchema } from '@bitbyte/shared';
import { publishable } from './plugins/publishable.js';

const jobOpeningSchema = new mongoose.Schema(
  { slug: { type: String, required: true, maxlength: 80, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } },
  { timestamps: true },
);
jobOpeningSchema.plugin(publishable, { schemaFor: (_doc, mode) => contentSchema('job', mode) });
jobOpeningSchema.index({ slug: 1 }, { unique: true });
jobOpeningSchema.index({ status: 1, 'published.closesAt': 1 });

export const JobOpening =
  mongoose.models.JobOpening ?? mongoose.model('JobOpening', jobOpeningSchema, 'jobOpenings');
