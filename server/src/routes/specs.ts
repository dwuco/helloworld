import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

const router = Router();

// GET /api/specs/:trimId
router.get('/:trimId', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const specs = db.prepare(`
      SELECT cs.*,
             ct.year, ct.trim_name, ct.msrp_new,
             mo.name as model_name, mo.body_style,
             ma.name as make_name
      FROM car_specs cs
      JOIN car_trims ct ON cs.trim_id = ct.trim_id
      JOIN models mo ON ct.model_id = mo.model_id
      JOIN makes ma ON ct.make_id = ma.make_id
      WHERE cs.trim_id = ?
    `).get(req.params.trimId);

    if (!specs) {
      return res.status(404).json({ success: false, error: 'Specs not found' });
    }
    return res.json({ success: true, data: specs });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/specs/compare?ids=trimId1,trimId2
router.get('/compare', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ success: false, error: 'ids parameter required' });
    }
    const trimIds = (ids as string).split(',').slice(0, 4); // max 4
    const db = getDb();

    const results = trimIds.map(trimId => {
      return db.prepare(`
        SELECT cs.*,
               ct.year, ct.trim_name, ct.msrp_new,
               mo.name as model_name, mo.body_style,
               ma.name as make_name
        FROM car_specs cs
        JOIN car_trims ct ON cs.trim_id = ct.trim_id
        JOIN models mo ON ct.model_id = mo.model_id
        JOIN makes ma ON ct.make_id = ma.make_id
        WHERE cs.trim_id = ?
      `).get(trimId);
    }).filter(Boolean);

    return res.json({ success: true, data: results });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
