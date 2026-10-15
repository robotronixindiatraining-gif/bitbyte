import { createContentSchemas } from '@bitbyte/shared';
import { sanitizeRichText } from './sanitize.js';

/** Server-side schema instance: identical rules to the shared ones, plus rich-text sanitising. */
export const serverSchemas = createContentSchemas({ sanitizeRichText });
