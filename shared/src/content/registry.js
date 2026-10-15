import { createKit } from './kit.js';
import { CONTENT_BUILDERS, SETTINGS_BUILDERS } from './entities.js';
import { buildSectionDataSchemas } from './sections.js';

/**
 * Build every content, settings and section schema for both modes.
 * The server calls this with `sanitizeRichText` (sanitize-html, D-014) so rich text is cleaned on
 * every write; the default instance below (no sanitiser) serves validation-only uses and the client.
 * @param {{ sanitizeRichText?: (html: string) => string }} [options]
 */
export function createContentSchemas(options = {}) {
  const kits = { draft: createKit('draft', options), publish: createKit('publish', options) };
  const build = (builders) =>
    Object.fromEntries(
      Object.entries(kits).map(([mode, k]) => [
        mode,
        Object.fromEntries(Object.entries(builders).map(([name, fn]) => [name, fn(k)])),
      ]),
    );
  const content = build(CONTENT_BUILDERS);
  const settings = build(SETTINGS_BUILDERS);
  const sections = Object.fromEntries(
    Object.entries(kits).map(([mode, k]) => [mode, buildSectionDataSchemas(k)]),
  );

  return {
    /** @param {'service'|'project'|'testimonial'|'job'|'page'|'ordering'} type @param {'draft'|'publish'} mode */
    contentSchema(type, mode) {
      const schema = content[mode]?.[type];
      if (!schema) throw new Error(`Unknown content type: ${type}`);
      return schema;
    },
    settingsSchema(key, mode) {
      const schema = settings[mode]?.[key];
      if (!schema) throw new Error(`Unknown settings key: ${key}`);
      return schema;
    },
    sectionDataSchema(type, mode) {
      return sections[mode]?.[type];
    },
  };
}

const defaultSchemas = createContentSchemas();
export const contentSchema = defaultSchemas.contentSchema;
export const settingsSchema = defaultSchemas.settingsSchema;
export const sectionDataSchema = defaultSchemas.sectionDataSchema;
