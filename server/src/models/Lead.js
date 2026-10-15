import mongoose from 'mongoose';

const { Schema } = mongoose;

export const LEAD_STATUSES = Object.freeze([
  'new',
  'contacted',
  'in_discussion',
  'won',
  'lost',
  'spam',
]);

export const NOTIFICATION_STATUSES = Object.freeze(['pending', 'accepted', 'failed', 'not_sent']);

/**
 * Contact-form submissions (fields mirror the indexed form, inventory P13a). Never exposed on
 * public routes. Deleted after `expiresAt` by the retention purge (D-032).
 */
const leadSchema = new Schema(
  {
    type: { type: String, enum: ['project_enquiry', 'career'], required: true },
    fullName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    companyName: { type: String, trim: true, maxlength: 120, default: '' },
    companyLocation: { type: String, trim: true, maxlength: 120, default: '' },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, minlength: 7, maxlength: 20 },
    budget: { type: String, maxlength: 60, default: '' },
    message: { type: String, required: true, minlength: 10, maxlength: 5000 },
    service: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
    sourcePath: { type: String, maxlength: 300, default: null },
    utm: {
      type: new Schema(
        {
          source: { type: String, maxlength: 100 },
          medium: { type: String, maxlength: 100 },
          campaign: { type: String, maxlength: 100 },
          term: { type: String, maxlength: 100 },
          content: { type: String, maxlength: 100 },
        },
        { _id: false },
      ),
      default: undefined,
    },
    consent: {
      type: new Schema(
        {
          given: { type: Boolean, required: true },
          text: { type: String, required: true, maxlength: 600 },
          at: { type: Date, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    status: { type: String, enum: LEAD_STATUSES, default: 'new' },
    notes: {
      type: [
        new Schema(
          {
            admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
            text: { type: String, required: true, maxlength: 2000 },
            at: { type: Date, default: () => new Date() },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
    /**
     * Notification e-mail state. `accepted` = the provider confirmed it accepted the message
     * (not a delivery receipt); `not_sent` = no e-mail was attempted (log driver or no recipients).
     */
    notification: {
      type: new Schema(
        {
          status: { type: String, enum: NOTIFICATION_STATUSES, default: 'pending' },
          attempts: { type: Number, default: 0 },
          lastAttemptAt: { type: Date, default: null },
          nextAttemptAt: { type: Date, default: null },
          acceptedAt: { type: Date, default: null },
          providerMessageId: { type: String, maxlength: 100, default: null },
          lastError: { type: String, maxlength: 300, default: null },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    ipHash: { type: String, default: null },
    userAgent: { type: String, maxlength: 300, default: null },
    spamSignals: {
      type: new Schema(
        {
          honeypot: { type: Boolean, default: false },
          fillTimeMs: { type: Number, default: null },
          /** Submitted faster than a person could fill in the form (< 3 s). */
          tooFast: { type: Boolean, default: false },
          /** pass = verified; unverified = Cloudflare unreachable; skipped = honeypot (not checked). */
          turnstile: { type: String, enum: ['pass', 'unverified', 'skipped', null], default: null },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    /** createdAt + retention; the daily purge deletes leads past this date (D-032). */
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

leadSchema.pre('validate', function requireConsent() {
  if (this.consent && this.consent.given !== true)
    this.invalidate('consent.given', 'Consent is required');
});

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ expiresAt: 1 });
leadSchema.index({ 'notification.status': 1, 'notification.nextAttemptAt': 1 });

export const Lead = mongoose.models.Lead ?? mongoose.model('Lead', leadSchema);
