import cron from 'node-cron';
import { runDailySync, logger } from '../services/syncService';

let job: cron.ScheduledTask | null = null;

/**
 * Schedule the daily update job to run at midnight every day
 */
export function scheduleDailyUpdate(): void {
  // Run at 00:00 every day
  job = cron.schedule('0 0 * * *', async () => {
    logger.info('Cron: daily update job triggered');
    try {
      const result = await runDailySync();
      logger.info(`Cron: daily update complete - prices updated: ${result.pricesUpdated}`);
    } catch (err) {
      logger.error('Cron: daily update failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, {
    timezone: 'America/New_York',
  });

  logger.info('Daily update job scheduled (runs at midnight ET)');
}

export function stopDailyUpdate(): void {
  if (job) {
    job.stop();
    job = null;
    logger.info('Daily update job stopped');
  }
}
