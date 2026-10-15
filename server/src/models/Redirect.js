import mongoose from 'mongoose';

const RESERVED_PREFIXES = ['/api', '/admin'];

/** Normalise a site path for storage/lookup: lower-case, no trailing slash, no query or hash. */
export function normalizePath(path) {
  const clean = String(path).split(/[?#]/)[0].trim().toLowerCase();
  if (clean === '/' || clean === '') return '/';
  return clean.replace(/\/+$/, '');
}

const redirectSchema = new mongoose.Schema(
  {
    fromPath: { type: String, required: true, maxlength: 300, match: /^\/[^\s]*$/ },
    toPath: {
      type: String,
      required: true,
      maxlength: 2048,
      match: /^(\/[^\s]*|https:\/\/[^\s]+)$/,
    },
    statusCode: { type: Number, enum: [301, 302], default: 301 },
    enabled: { type: Boolean, default: true },
    source: { type: String, enum: ['legacy', 'slug-change', 'manual'], required: true },
    hits: { type: Number, default: 0 },
    lastHitAt: { type: Date, default: null },
  },
  { timestamps: true },
);

redirectSchema.pre('validate', function checkPaths() {
  if (this.fromPath) this.fromPath = normalizePath(this.fromPath);
  if (RESERVED_PREFIXES.some((p) => this.fromPath === p || this.fromPath?.startsWith(`${p}/`))) {
    this.invalidate('fromPath', 'Cannot redirect reserved paths');
  }
  if (this.toPath && normalizePath(this.toPath) === this.fromPath) {
    this.invalidate('toPath', 'A redirect cannot point to itself');
  }
});
redirectSchema.index({ fromPath: 1 }, { unique: true });

export const Redirect = mongoose.models.Redirect ?? mongoose.model('Redirect', redirectSchema);
