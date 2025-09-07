import { Request, Response, NextFunction } from 'express';
import pool from '../database/connection';
import { timingSafeEqual } from 'crypto';

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.headers['x-api-key'];
    const headerKey = String(Array.isArray(raw) ? raw[0] : raw || '').trim();

    const result = await pool.query('SELECT api_key FROM settings LIMIT 1');
    const dbKey = String(result.rows?.[0]?.api_key ?? '').trim();

    console.log('[AUTH]', {
      path: req.path,
      headerLen: headerKey.length,
      headerKey,
      dbLen: dbKey.length,
      dbKey,
      dbUrl: process.env.DATABASE_URL || `${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });

    const a = Buffer.from(headerKey, 'utf8');
    const b = Buffer.from(dbKey, 'utf8');
    const ok = a.length === b.length && timingSafeEqual(a, b);

    if (!ok) return res.status(401).json({ error: 'Unauthorized' });
    return next();
  } catch (err: any) {
    console.error('[AUTH][ERROR]', err?.message || err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
