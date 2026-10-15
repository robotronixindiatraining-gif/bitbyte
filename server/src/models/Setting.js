import mongoose from 'mongoose';
import { SETTINGS_KEYS, settingsSchema } from '@bitbyte/shared';
import { publishable } from './plugins/publishable.js';

const settingSchema = new mongoose.Schema(
  { key: { type: String, enum: SETTINGS_KEYS, required: true } },
  { timestamps: true },
);
settingSchema.plugin(publishable, { schemaFor: (doc, mode) => settingsSchema(doc.key, mode) });
settingSchema.index({ key: 1 }, { unique: true });

export const Setting =
  mongoose.models.Setting ?? mongoose.model('Setting', settingSchema, 'settings');
