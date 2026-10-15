const HOUR_MS = 3_600_000;

/**
 * In-process scheduler for a single server instance (DEPLOYMENT.md §6):
 * - retention purge: shortly after start-up, then every 24 h;
 * - lead notification retries: every 5 min.
 * A job never overlaps with itself, errors are logged and the next run tries again, and the
 * timers do not keep the process alive. With several instances, enable jobs on one only
 * (JOBS_ENABLED=false elsewhere).
 */
export function startJobs({ retention, notifications, logger, intervals = {} }) {
  const jobs = [
    {
      name: 'retention-purge',
      run: () => retention.purgeExpired(),
      firstMs: 60_000,
      everyMs: 24 * HOUR_MS,
    },
    {
      name: 'lead-notification-retry',
      run: () => notifications.retryDue(),
      firstMs: 30_000,
      everyMs: 5 * 60_000,
    },
  ];
  const timers = [];
  for (const job of jobs) {
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        await job.run();
      } catch (err) {
        logger.error(
          { err: { name: err?.name, message: err?.message }, job: job.name },
          'scheduled job failed',
        );
      } finally {
        running = false;
      }
    };
    const first = setTimeout(() => {
      void tick();
      const every = setInterval(() => void tick(), intervals[job.name] ?? job.everyMs);
      every.unref();
      timers.push(every);
    }, job.firstMs);
    first.unref();
    timers.push(first);
  }
  return {
    stop() {
      timers.forEach((timer) => clearTimeout(timer));
    },
  };
}
