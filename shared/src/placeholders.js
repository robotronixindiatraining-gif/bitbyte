/**
 * Placeholder guard (D-015): unverified facts are stored as tokens such as
 * "[CONFIRM COMPANY FOUNDING YEAR]" and content containing them cannot be published.
 */
export const PLACEHOLDER_PATTERN = /\[CONFIRM[^\]]*\]/g;

/**
 * Recursively find placeholder tokens in strings, arrays and plain objects.
 * @param {unknown} value
 * @param {string} [path]
 * @returns {{ path: string, token: string }[]}
 */
export function findPlaceholders(value, path = '') {
  if (typeof value === 'string') {
    return [...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => ({ path, token: match[0] }));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findPlaceholders(item, path ? `${path}.${index}` : String(index)),
    );
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.entries(value).flatMap(([key, item]) =>
      findPlaceholders(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

/** @param {unknown} value */
export function hasPlaceholders(value) {
  return findPlaceholders(value).length > 0;
}
