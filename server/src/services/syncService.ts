import { syncNhtsaMakesAndModels } from './nhtsaService';
import { updateTodayPrices } from './pricingService';
import { getDb } from '../db/database';
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [new winston.transports.Console()],
});

export interface SyncResult {
  success: boolean;
  timestamp: string;
  makesAdded: number;
  modelsAdded: number;
  pricesUpdated: number;
  errors: string[];
}

export async function runDailySync(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    timestamp: new Date().toISOString(),
    makesAdded: 0,
    modelsAdded: 0,
    pricesUpdated: 0,
    errors: [],
  };

  logger.info('Starting daily sync...');

  // Step 1: Sync NHTSA data (only top makes to avoid rate limits)
  try {
    const nhtsaResult = await syncNhtsaMakesAndModels(true);
    result.makesAdded = nhtsaResult.makes;
    result.modelsAdded = nhtsaResult.models;
    logger.info(`NHTSA sync complete: ${nhtsaResult.makes} makes, ${nhtsaResult.models} models added`);
  } catch (err) {
    const msg = `NHTSA sync error: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(msg);
    result.errors.push(msg);
  }

  // Step 2: Update today's prices for all trims
  try {
    const priceCount = updateTodayPrices();
    result.pricesUpdated = priceCount;
    logger.info(`Price update complete: ${priceCount} trims updated`);
  } catch (err) {
    const msg = `Price update error: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(msg);
    result.errors.push(msg);
  }

  // Step 3: Log summary to DB sync_log table (if it exists)
  try {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        makes_added INTEGER,
        models_added INTEGER,
        prices_updated INTEGER,
        errors TEXT,
        success INTEGER
      )
    `);
    db.prepare(`
      INSERT INTO sync_log (makes_added, models_added, prices_updated, errors, success)
      VALUES (?, ?, ?, ?, ?)
    `).run(result.makesAdded, result.modelsAdded, result.pricesUpdated, JSON.stringify(result.errors), result.errors.length === 0 ? 1 : 0);
  } catch (err) {
    logger.warn('Could not log sync to DB: ' + (err instanceof Error ? err.message : String(err)));
  }

  result.success = result.errors.length === 0;
  logger.info(`Daily sync finished. Success=${result.success}`);
  return result;
}
