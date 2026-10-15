import { apiRequest } from './client.js';

/** GET /api/v1/health → { status, db } (liveness, D-041). */
export async function getHealth({ signal } = {}) {
  const { data } = await apiRequest('/health', { signal });
  return data;
}
