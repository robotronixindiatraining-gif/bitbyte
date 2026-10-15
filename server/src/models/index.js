import { Admin } from './Admin.js';
import { AuditLog } from './AuditLog.js';
import { JobOpening } from './JobOpening.js';
import { Lead } from './Lead.js';
import { Media } from './Media.js';
import { Ordering } from './Ordering.js';
import { Page } from './Page.js';
import { Project } from './Project.js';
import { Redirect } from './Redirect.js';
import { Revision } from './Revision.js';
import { Service } from './Service.js';
import { Session } from './Session.js';
import { Setting } from './Setting.js';
import { Taxonomy } from './Taxonomy.js';
import { Testimonial } from './Testimonial.js';

export {
  Admin,
  AuditLog,
  JobOpening,
  Lead,
  Media,
  Ordering,
  Page,
  Project,
  Redirect,
  Revision,
  Service,
  Session,
  Setting,
  Taxonomy,
  Testimonial,
};

/** The 15 documented collections (docs/DATABASE_SCHEMA.md §1). */
export const ALL_MODELS = [
  Admin,
  Session,
  Setting,
  Page,
  Service,
  Project,
  Taxonomy,
  Testimonial,
  JobOpening,
  Media,
  Lead,
  Redirect,
  Revision,
  AuditLog,
  Ordering,
];

/**
 * Create any missing indexes. Never drops indexes (unlike syncIndexes), so it is safe on
 * production data. Called after the database connects and by the CLI.
 */
export async function ensureIndexes() {
  for (const model of ALL_MODELS) {
    await model.createCollection().catch((err) => {
      if (err.codeName !== 'NamespaceExists') throw err;
    });
    await model.createIndexes();
  }
}
