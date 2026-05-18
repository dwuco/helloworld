import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';
import { getCurrentPrice } from '../services/pricingService';

const router = Router();

// GET /api/makes
router.get('/makes', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const makes = db.prepare(`
      SELECT m.make_id, m.name, m.country,
             COUNT(DISTINCT mo.model_id) as model_count
      FROM makes m
      LEFT JOIN models mo ON m.make_id = mo.make_id
      GROUP BY m.make_id
      ORDER BY m.name ASC
    `).all();
    res.json({ success: true, data: makes });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/makes/:makeId/models
router.get('/makes/:makeId/models', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const models = db.prepare(`
      SELECT mo.model_id, mo.make_id, mo.name, mo.body_style,
             COUNT(DISTINCT ct.trim_id) as trim_count,
             MIN(ct.year) as min_year,
             MAX(ct.year) as max_year
      FROM models mo
      LEFT JOIN car_trims ct ON mo.model_id = ct.model_id
      WHERE mo.make_id = ?
      GROUP BY mo.model_id
      ORDER BY mo.name ASC
    `).all(req.params.makeId);
    res.json({ success: true, data: models });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/models/:modelId/years
router.get('/models/:modelId/years', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const years = db.prepare(`
      SELECT DISTINCT year FROM car_trims
      WHERE model_id = ?
      ORDER BY year DESC
    `).all(req.params.modelId);
    res.json({ success: true, data: years.map((r: any) => r.year) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/cars/popular
router.get('/cars/popular', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const cars = db.prepare(`
      SELECT ct.trim_id, ct.year, ct.trim_name, ct.msrp_new, ct.is_popular,
             mo.name as model_name, mo.body_style,
             ma.name as make_name, ma.make_id,
             mo.model_id,
             cs.engine_horsepower, cs.fuel_combined, cs.drivetrain
      FROM car_trims ct
      JOIN models mo ON ct.model_id = mo.model_id
      JOIN makes ma ON ct.make_id = ma.make_id
      LEFT JOIN car_specs cs ON ct.trim_id = cs.trim_id
      WHERE ct.is_popular = 1
      ORDER BY ma.name ASC, mo.name ASC, ct.year DESC
      LIMIT 20
    `).all();

    const result = (cars as any[]).map(car => ({
      ...car,
      current_price: getCurrentPrice(car.trim_id),
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/cars/search?q=&make=&model=&year=&body_style=&min_price=&max_price=
router.get('/cars/search', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { q, make, model, year, body_style, min_price, max_price } = req.query;

    let sql = `
      SELECT ct.trim_id, ct.year, ct.trim_name, ct.msrp_new, ct.is_popular,
             mo.name as model_name, mo.body_style,
             ma.name as make_name, ma.make_id,
             mo.model_id,
             cs.engine_horsepower, cs.fuel_combined, cs.drivetrain,
             (SELECT market_price FROM price_history WHERE trim_id = ct.trim_id ORDER BY price_date DESC LIMIT 1) as current_price
      FROM car_trims ct
      JOIN models mo ON ct.model_id = mo.model_id
      JOIN makes ma ON ct.make_id = ma.make_id
      LEFT JOIN car_specs cs ON ct.trim_id = cs.trim_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (q) {
      sql += ` AND (ma.name LIKE ? OR mo.name LIKE ? OR ct.trim_name LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (make) {
      sql += ` AND ma.make_id = ?`;
      params.push(make as string);
    }
    if (model) {
      sql += ` AND mo.model_id = ?`;
      params.push(model as string);
    }
    if (year) {
      sql += ` AND ct.year = ?`;
      params.push(Number(year));
    }
    if (body_style) {
      sql += ` AND mo.body_style = ?`;
      params.push(body_style as string);
    }
    if (min_price) {
      sql += ` AND ct.msrp_new >= ?`;
      params.push(Number(min_price));
    }
    if (max_price) {
      sql += ` AND ct.msrp_new <= ?`;
      params.push(Number(max_price));
    }

    sql += ` ORDER BY ct.is_popular DESC, ma.name ASC, mo.name ASC, ct.year DESC LIMIT 50`;

    const cars = db.prepare(sql).all(...params);
    res.json({ success: true, data: cars });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/cars/:id - full car details
router.get('/cars/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const car = db.prepare(`
      SELECT ct.trim_id, ct.year, ct.trim_name, ct.msrp_new, ct.is_popular,
             mo.name as model_name, mo.body_style, mo.model_id,
             ma.name as make_name, ma.make_id, ma.country
      FROM car_trims ct
      JOIN models mo ON ct.model_id = mo.model_id
      JOIN makes ma ON ct.make_id = ma.make_id
      WHERE ct.trim_id = ?
    `).get(req.params.id) as any;

    if (!car) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    const specs = db.prepare(`SELECT * FROM car_specs WHERE trim_id = ?`).get(req.params.id) as any;

    const currentPrice = getCurrentPrice(req.params.id);

    // Similar cars (same body style, similar year)
    const similar = db.prepare(`
      SELECT ct.trim_id, ct.year, ct.trim_name, ct.msrp_new,
             mo.name as model_name, mo.body_style,
             ma.name as make_name,
             (SELECT market_price FROM price_history WHERE trim_id = ct.trim_id ORDER BY price_date DESC LIMIT 1) as current_price
      FROM car_trims ct
      JOIN models mo ON ct.model_id = mo.model_id
      JOIN makes ma ON ct.make_id = ma.make_id
      WHERE mo.body_style = ?
        AND ct.trim_id != ?
        AND ABS(ct.year - ?) <= 2
      ORDER BY ct.is_popular DESC
      LIMIT 4
    `).all(car.body_style, req.params.id, car.year);

    return res.json({
      success: true,
      data: {
        ...car,
        specs,
        current_price: currentPrice,
        similar_cars: similar,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
