import fetch from 'node-fetch';
import { getDb } from '../db/database';

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

interface NhtsaMake {
  Make_ID: number;
  Make_Name: string;
}

interface NhtsaModel {
  Model_ID: number;
  Model_Name: string;
  Make_ID: number;
  Make_Name: string;
}

export async function fetchAndStoreMakes(): Promise<number> {
  const url = `${NHTSA_BASE}/getallmakes?format=json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`NHTSA makes fetch failed: ${resp.status}`);
  const data = await resp.json() as { Results: NhtsaMake[] };
  const makes = data.Results;

  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO makes (make_id, name, country)
    VALUES (@make_id, @name, @country)
  `);
  const insertMany = db.transaction((rows: NhtsaMake[]) => {
    let count = 0;
    for (const m of rows) {
      const result = insert.run({
        make_id: `nhtsa_${m.Make_ID}`,
        name: m.Make_Name,
        country: null,
      });
      count += result.changes;
    }
    return count;
  });

  const inserted = insertMany(makes);
  return inserted;
}

export async function fetchAndStoreModelsForMake(makeId: string, makeName: string): Promise<number> {
  const encoded = encodeURIComponent(makeName);
  const url = `${NHTSA_BASE}/getmodelsformake/${encoded}?format=json`;
  const resp = await fetch(url);
  if (!resp.ok) return 0;
  const data = await resp.json() as { Results: NhtsaModel[] };
  const models = data.Results || [];

  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO models (model_id, make_id, name, body_style)
    VALUES (@model_id, @make_id, @name, @body_style)
  `);
  const insertMany = db.transaction((rows: NhtsaModel[]) => {
    let count = 0;
    for (const m of rows) {
      const result = insert.run({
        model_id: `nhtsa_${m.Model_ID}`,
        make_id: makeId,
        name: m.Model_Name,
        body_style: null,
      });
      count += result.changes;
    }
    return count;
  });

  return insertMany(models);
}

export async function syncNhtsaMakesAndModels(topMakesOnly = true): Promise<{ makes: number; models: number }> {
  // For daily sync, only update top makes to avoid API overload
  const db = getDb();

  let makesInserted = 0;
  if (topMakesOnly) {
    // Just verify our seeded makes are there - don't bulk import all 10k+ makes
    makesInserted = 0;
  } else {
    makesInserted = await fetchAndStoreMakes();
  }

  // Sync models for makes already in our DB
  const makes = db.prepare('SELECT make_id, name FROM makes LIMIT 100').all() as { make_id: string; name: string }[];
  let modelsInserted = 0;
  for (const make of makes) {
    try {
      const count = await fetchAndStoreModelsForMake(make.make_id, make.name);
      modelsInserted += count;
    } catch {
      // continue on error
    }
  }

  return { makes: makesInserted, models: modelsInserted };
}
