import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';
import { isValidStellarAddress } from '../stellar.js';
const router = Router();
const updateProfileSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional().or(z.literal('')),
    bio: z.string().max(500).optional(),
    role: z.enum(['client', 'freelancer', 'both']).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
});
router.get('/:address', async (req, res) => {
    const { address } = req.params;
    if (!isValidStellarAddress(address)) {
        res.status(400).json({ error: { code: 'bad_request', message: 'Invalid Stellar address' } });
        return;
    }
    try {
        const profileRes = await query('SELECT * FROM profiles WHERE wallet_address = $1', [address]);
        if (profileRes.rowCount === 0) {
            res.status(404).json({ error: { code: 'not_found', message: 'Profile not found' } });
            return;
        }
        res.json({ ok: true, profile: profileRes.rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: { code: 'internal_error', message: err.message } });
    }
});
router.put('/me', requireAuth, async (req, res) => {
    try {
        const data = updateProfileSchema.parse(req.body);
        const walletAddress = req.walletAddress;
        const fields = [];
        const values = [];
        let idx = 1;
        if (data.name !== undefined) {
            fields.push(`name = $${idx++}`);
            values.push(data.name);
        }
        if (data.email !== undefined) {
            fields.push(`email = $${idx++}`);
            values.push(data.email || null);
        }
        if (data.bio !== undefined) {
            fields.push(`bio = $${idx++}`);
            values.push(data.bio);
        }
        if (data.role !== undefined) {
            fields.push(`role = $${idx++}`);
            values.push(data.role);
        }
        if (data.avatarUrl !== undefined) {
            fields.push(`avatar_url = $${idx++}`);
            values.push(data.avatarUrl || null);
        }
        fields.push(`updated_at = NOW()`);
        values.push(walletAddress);
        const updateQuery = `
      UPDATE profiles
      SET ${fields.join(', ')}
      WHERE wallet_address = $${idx}
      RETURNING *
    `;
        const result = await query(updateQuery, values, walletAddress);
        res.json({ ok: true, profile: result.rows[0] });
    }
    catch (err) {
        res.status(400).json({ error: { code: 'bad_request', message: err.message } });
    }
});
export default router;
