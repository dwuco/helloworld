import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';
import { getPriceHistory, getCurrentPrice } from '../services/pricingService';

const router = Router();

// GET /api/prices/:trimId - current + last 24 months history
router.get('/:trimId', (req: Request, res: Response) => {
  try {
    const { trimId } = req.params;
    const db = getDb();

    // Verify trim exists
    const trim = db.prepare(`
      SELECT ct.trim_id, ct.year, ct.trim_name, ct.msrp_new,
             mo.name as model_name, ma.name as make_name
      FROM car_trims ct
      JOIN models mo ON ct.model_id = mo.model_id
      JOIN makes ma ON ct.make_id = ma.make_id
      WHERE ct.trim_id = ?
    `).get(trimId) as any;

    if (!trim) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    const history = getPriceHistory(trimId);
    const currentPrice = getCurrentPrice(trimId);

    // Compute price change vs 1 year ago
    let priceChange = null;
    let priceChangePercent = null;
    if (history.length >= 12) {
      const oneYearAgo = history[history.length - 13]?.price;
      const latest = history[history.length - 1]?.price;
      if (oneYearAgo && latest) {
        priceChange = latest - oneYearAgo;
        priceChangePercent = ((latest - oneYearAgo) / oneYearAgo) * 100;
      }
    }

    return res.json({
      success: true,
      data: {
        trim_id: trimId,
        make: trim.make_name,
        model: trim.model_name,
        year: trim.year,
        trim: trim.trim_name,
        msrp_new: trim.msrp_new,
        current_price: currentPrice,
        price_change_1y: priceChange ? Math.round(priceChange) : null,
        price_change_1y_pct: priceChangePercent ? Math.round(priceChangePercent * 10) / 10 : null,
        history,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
