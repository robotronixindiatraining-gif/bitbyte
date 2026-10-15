import mongoose from 'mongoose';

export const TAXONOMY_TYPES = Object.freeze(['projectCategory', 'technology']);

/** Project categories and technology tags (labels only; category order lives in `orderings`). */
const taxonomySchema = new mongoose.Schema(
  {
    type: { type: String, enum: TAXONOMY_TYPES, required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    slug: { type: String, required: true, maxlength: 80, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    seedKey: { type: String },
  },
  { timestamps: true },
);
taxonomySchema.index({ type: 1, slug: 1 }, { unique: true });
taxonomySchema.index(
  { seedKey: 1 },
  { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } },
);

export const Taxonomy =
  mongoose.models.Taxonomy ?? mongoose.model('Taxonomy', taxonomySchema, 'taxonomies');
