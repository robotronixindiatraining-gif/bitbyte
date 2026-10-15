import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Image metadata only — binaries live in Cloudinary or local dev storage (D-013, D-018). */
const mediaSchema = new Schema(
  {
    driver: { type: String, enum: ['cloudinary', 'local'], required: true },
    storageKey: { type: String, required: true, maxlength: 300 },
    version: { type: Number, default: null },
    format: { type: String, maxlength: 10, default: null },
    url: { type: String, required: true, maxlength: 2048, match: /^(https:\/\/|\/)/ },
    originalFilename: { type: String, maxlength: 255, default: null },
    mimeType: {
      type: String,
      enum: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      required: true,
    },
    bytes: { type: Number, min: 1, max: 10 * 1024 * 1024, required: true },
    width: { type: Number, min: 1, max: 12_000, required: true },
    height: { type: Number, min: 1, max: 12_000, required: true },
    dominantColor: { type: String, match: /^#[0-9a-f]{6}$/i, default: null },
    alt: { type: String, trim: true, maxlength: 250, default: '' },
    decorative: { type: Boolean, default: false },
    caption: { type: String, maxlength: 300, default: '' },
    credit: { type: String, maxlength: 200, default: '' },
    licence: { type: String, maxlength: 200, default: '' },
    folder: { type: String, maxlength: 60, default: 'general' },
    tags: { type: [{ type: String, maxlength: 40 }], default: [] },
    checksum: { type: String, match: /^[a-f0-9]{64}$/, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true },
);

mediaSchema.pre('validate', function requireAlt() {
  if (!this.decorative && !this.alt?.trim()) {
    this.invalidate('alt', 'Alt text is required unless the image is decorative');
  }
});

mediaSchema.index({ storageKey: 1 }, { unique: true });
mediaSchema.index({ checksum: 1 });
mediaSchema.index({ folder: 1, createdAt: -1 });
mediaSchema.index({ alt: 'text', originalFilename: 'text', tags: 'text' }, { name: 'media_text' });

export const Media = mongoose.models.Media ?? mongoose.model('Media', mediaSchema, 'media');
