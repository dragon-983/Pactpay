import { Router } from 'express';
import { z } from 'zod';
import { createAuthChallenge, verifyAuthSignature, requireAuth, AuthRequest } from '../auth.js';
import { query } from '../db.js';

const router = Router();

const challengeSchema = z.object({
  walletAddress: z.string().min(56).max(56),
});

const verifySchema = z.object({
  walletAddress: z.string().min(56).max(56),
  nonce: z.string(),
  signature: z.string(),
});

router.post('/challenge', async (req, res) => {
  try {
    const { walletAddress } = challengeSchema.parse(req.body);
    const nonce = await createAuthChallenge(walletAddress);
    res.json({ ok: true, nonce, message: `Please sign this challenge with your wallet to sign in to PactPay:\n\n${nonce}` });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'bad_request', message: err.message } });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, nonce, signature } = verifySchema.parse(req.body);
    const result = await verifyAuthSignature(walletAddress, nonce, signature);
    
    // Fetch user profile
    const profileRes = await query('SELECT * FROM profiles WHERE wallet_address = $1', [walletAddress]);
    
    res.json({
      ok: true,
      token: result.token,
      walletAddress: result.walletAddress,
      expiresAt: result.expiresAt,
      profile: profileRes.rows[0] || null,
    });
  } catch (err: any) {
    res.status(401).json({ error: { code: 'unauthorized', message: err.message } });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profileRes = await query('SELECT * FROM profiles WHERE wallet_address = $1', [req.walletAddress]);
    res.json({
      ok: true,
      walletAddress: req.walletAddress,
      profile: profileRes.rows[0] || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'internal_error', message: err.message } });
  }
});

router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      // Remove session
      await query('DELETE FROM wallet_sessions WHERE token_hash = sha256($1::bytea)', [token]);
    }
    res.json({ ok: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'internal_error', message: err.message } });
  }
});

export default router;

