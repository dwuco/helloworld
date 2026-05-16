import { getDb } from '../db/database';

interface TrimRow {
  trim_id: string;
  msrp_new: number;
  year: number;
  body_style: string | null;
}

/**
 * Compute a realistic market price for a used car based on:
 * - Original MSRP
 * - Age (years since manufacture)
 * - Seasonal variation
 * - Random market noise
 */
export function computeMarketPrice(
  msrpNew: number,
  carYear: number,
  targetDate: Date,
  bodStyle: string | null,
  seedOffset = 0
): number {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth(); // 0-based

  // Age from target date perspective
  const ageYears = targetYear - carYear + targetMonth / 12;

  // Depreciation curve
  let retainedValue: number;
  if (ageYears <= 0) {
    retainedValue = 1.0;
  } else if (ageYears <= 1) {
    // First year: drops ~18%
    retainedValue = 1.0 - 0.18 * ageYears;
  } else if (ageYears <= 2) {
    // Second year: another ~13%
    retainedValue = 0.82 - 0.13 * (ageYears - 1);
  } else if (ageYears <= 3) {
    retainedValue = 0.69 - 0.11 * (ageYears - 2);
  } else if (ageYears <= 5) {
    retainedValue = 0.58 - 0.09 * (ageYears - 3);
  } else if (ageYears <= 8) {
    retainedValue = 0.40 - 0.05 * (ageYears - 5);
  } else if (ageYears <= 12) {
    retainedValue = 0.25 - 0.03 * (ageYears - 8);
  } else {
    retainedValue = Math.max(0.08, 0.13 - 0.01 * (ageYears - 12));
  }

  // Seasonal variation (month 0=Jan, 11=Dec)
  // Convertibles peak in summer, trucks peak in spring
  let seasonal = 1.0;
  const isConvertible = (bodStyle?.toLowerCase().includes('convert')) ?? false;
  const isTruck = ((bodStyle?.toLowerCase().includes('truck')) ?? false) || ((bodStyle?.toLowerCase().includes('pickup')) ?? false);

  if (isConvertible) {
    // Summer premium for convertibles
    const summerFactor = Math.sin(((targetMonth - 2) / 12) * 2 * Math.PI);
    seasonal = 1.0 + 0.04 * summerFactor;
  } else if (isTruck) {
    // Spring buying season for trucks
    const springFactor = Math.sin(((targetMonth - 1) / 12) * 2 * Math.PI);
    seasonal = 1.0 + 0.025 * springFactor;
  } else {
    // General seasonal: slight dip in winter
    const factor = Math.sin(((targetMonth - 3) / 12) * 2 * Math.PI);
    seasonal = 1.0 + 0.015 * factor;
  }

  // Deterministic pseudo-random noise based on trim+date (so it's reproducible)
  const dateSeed = targetYear * 12 + targetMonth + seedOffset;
  const noise = pseudoRandom(dateSeed) * 0.06 - 0.03; // ±3%

  const price = msrpNew * retainedValue * seasonal * (1 + noise);
  return Math.round(price / 100) * 100; // round to nearest $100
}

function pseudoRandom(seed: number): number {
  // Simple deterministic PRNG
  let x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/**
 * Generate 24 months of historical pricing for a trim
 */
export function generateHistoricalPrices(
  trimId: string,
  msrpNew: number,
  carYear: number,
  bodyStyle: string | null,
  seedOffset = 0
): Array<{ trim_id: string; price_date: string; market_price: number; price_type: string; mileage_basis: number }> {
  const today = new Date();
  const records = [];

  for (let monthsBack = 23; monthsBack >= 0; monthsBack--) {
    const d = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    const dateStr = d.toISOString().split('T')[0];
    const price = computeMarketPrice(msrpNew, carYear, d, bodyStyle, seedOffset);
    // Estimate mileage at that point (assume ~12k miles/year)
    const mileage = Math.round((monthsBack / 12) * 12000 * ((today.getFullYear() - carYear) + 1));

    records.push({
      trim_id: trimId,
      price_date: dateStr,
      market_price: price,
      price_type: carYear >= today.getFullYear() - 1 ? 'new' : 'used',
      mileage_basis: Math.max(0, mileage),
    });
  }

  return records;
}

/**
 * Insert today's price for all trims (daily job)
 */
export function updateTodayPrices(): number {
  const db = getDb();
  const trims = db.prepare(`
    SELECT ct.trim_id, ct.msrp_new, ct.year, m.body_style
    FROM car_trims ct
    LEFT JOIN models m ON ct.model_id = m.model_id
    WHERE ct.msrp_new IS NOT NULL
  `).all() as TrimRow[];

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO price_history (trim_id, price_date, market_price, price_type, mileage_basis, notes)
    VALUES (@trim_id, @price_date, @market_price, @price_type, @mileage_basis, @notes)
  `);

  const run = db.transaction((rows: TrimRow[]) => {
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const t = rows[i];
      const price = computeMarketPrice(t.msrp_new, t.year, today, t.body_style, i);
      upsert.run({
        trim_id: t.trim_id,
        price_date: dateStr,
        market_price: price,
        price_type: t.year >= today.getFullYear() - 1 ? 'new' : 'used',
        mileage_basis: 0,
        notes: 'daily-update',
      });
      count++;
    }
    return count;
  });

  return run(trims);
}

/**
 * Get price history for a trim (last 24 months)
 */
export function getPriceHistory(trimId: string): Array<{ date: string; price: number; type: string }> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT price_date, market_price, price_type
    FROM price_history
    WHERE trim_id = ?
    ORDER BY price_date ASC
    LIMIT 24
  `).all(trimId) as { price_date: string; market_price: number; price_type: string }[];

  return rows.map(r => ({
    date: r.price_date,
    price: r.market_price,
    type: r.price_type,
  }));
}

/**
 * Get current (latest) price for a trim
 */
export function getCurrentPrice(trimId: string): number | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT market_price FROM price_history
    WHERE trim_id = ?
    ORDER BY price_date DESC
    LIMIT 1
  `).get(trimId) as { market_price: number } | undefined;
  return row ? row.market_price : null;
}
