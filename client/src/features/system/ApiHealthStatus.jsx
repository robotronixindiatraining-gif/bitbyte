import { useApiHealth } from './useApiHealth.js';

const DB_LABELS = {
  up: 'connected',
  connecting: 'connecting',
  down: 'unavailable',
  disabled: 'not configured',
};

/** Frontend health check: shows whether the client can reach the API (Stage 03 foundation). */
export function ApiHealthStatus() {
  const { data, error, isPending } = useApiHealth();

  let tone = 'bg-neutral-400';
  let text = 'Checking API…';
  if (data) {
    tone = data.db === 'up' ? 'bg-success-700' : 'bg-warning-700';
    text = `API online · Database ${DB_LABELS[data.db] ?? data.db}`;
  } else if (error) {
    tone = 'bg-danger-600';
    text = 'API unreachable';
  }

  return (
    <p
      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-700"
      role="status"
      aria-live="polite"
      aria-busy={isPending}
    >
      <span className={`size-2.5 rounded-full ${tone}`} aria-hidden="true" />
      {text}
    </p>
  );
}
