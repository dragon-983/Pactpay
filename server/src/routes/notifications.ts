import { Router } from 'express';
import { requireAuth, AuthRequest } from '../auth.js';
import { query } from '../db.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const wallet = req.walletAddress!;

  try {
    const notifs = await query(
      `SELECT * FROM notifications
       WHERE recipient_address = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [wallet],
      wallet
    );

    const unreadCountRes = await query(
      `SELECT COUNT(*) FROM notifications
       WHERE recipient_address = $1 AND read = FALSE`,
      [wallet],
      wallet
    );

    res.json({
      ok: true,
      unreadCount: parseInt(unreadCountRes.rows[0].count, 10),
      notifications: notifs.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'internal_error', message: err.message } });
  }
});

router.patch('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  const wallet = req.walletAddress!;
  const { id } = req.params;

  try {
    await query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND recipient_address = $2`,
      [id, wallet],
      wallet
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'internal_error', message: err.message } });
  }
});

router.post('/read-all', requireAuth, async (req: AuthRequest, res) => {
  const wallet = req.walletAddress!;

  try {
    await query(
      `UPDATE notifications SET read = TRUE WHERE recipient_address = $1`,
      [wallet],
      wallet
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'internal_error', message: err.message } });
  }
});

export default router;

