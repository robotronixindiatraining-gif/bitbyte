import mongoose from 'mongoose';
import { contentSchema } from '@bitbyte/shared';
import { publishable } from './plugins/publishable.js';

const { Schema } = mongoose;

const testimonialSchema = new Schema(
  {
    /** Written consent from the person quoted; required to publish. */
    consent: {
      type: new Schema(
        {
          confirmed: { type: Boolean, default: false },
          confirmedAt: { type: Date, default: null },
          confirmedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
          method: { type: String, enum: ['email', 'document', 'other', null], default: null },
          note: { type: String, maxlength: 500, default: '' },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  { timestamps: true },
);
testimonialSchema.plugin(publishable, {
  schemaFor: (_doc, mode) => contentSchema('testimonial', mode),
});
testimonialSchema.index({ 'published.featured': 1 });

export const Testimonial =
  mongoose.models.Testimonial ?? mongoose.model('Testimonial', testimonialSchema);
