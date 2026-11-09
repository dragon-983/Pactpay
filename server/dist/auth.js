import crypto from 'crypto';
import { query } from './db.js';
import { generateChallengeNonce, isValidStellarAddress, verifyWalletSignature } from './stellar.js';
/**
 * Creates or gets an active challenge nonce for a wallet
 */
export async function createAuthChallenge(walletAddress) {
    if (!isValidStellarAddress(walletAddress)) {
        throw new Error('Invalid Stellar address');
    }
    // Ensure profile exists
    await query(`INSERT INTO profiles (wallet_address, name)
     VALUES ($1, $2)
     ON CONFLICT (wallet_address) DO NOTHING`, [walletAddress, walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4)]);
    const nonce = generateChallengeNonce(walletAddress);
    const dummyTokenHash = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await query(`INSERT INTO wallet_sessions (wallet_address, nonce, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`, [walletAddress, nonce, dummyTokenHash, expiresAt]);
    return nonce;
}
/**
 * Verifies signed challenge nonce and issues a bearer session token
 */
export async function verifyAuthSignature(walletAddress, nonce, signature) {
    if (!isValidStellarAddress(walletAddress)) {
        throw new Error('Invalid Stellar address');
    }
    // Find matching pending session
    const res = await query(`SELECT id, nonce, expires_at
     FROM wallet_sessions
     WHERE wallet_address = $1 AND nonce = $2 AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`, [walletAddress, nonce]);
    if (res.rowCount === 0) {
        throw new Error('Invalid or expired authentication challenge nonce');
    }
    const valid = verifyWalletSignature(walletAddress, nonce, signature);
    if (!valid) {
        throw new Error('Invalid signature for the provided challenge nonce');
    }
    // Generate secure session bearer token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    // Update session record with verified token hash
    await query(`UPDATE wallet_sessions
     SET token_hash = $1, expires_at = $2
     WHERE id = $3`, [tokenHash, sessionExpiresAt, res.rows[0].id]);
    return {
        token: sessionToken,
        walletAddress,
        expiresAt: sessionExpiresAt,
    };
}
/**
 * Express middleware to authenticate session token and establish RLS context
 */
export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: { code: 'unauthorized', message: 'Missing or malformed Authorization header' } });
        return;
    }
    const token = authHeader.slice(7).trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
        const sessionRes = await query(`SELECT wallet_address, expires_at
       FROM wallet_sessions
       WHERE token_hash = $1 AND expires_at > NOW()
       LIMIT 1`, [tokenHash]);
        if (sessionRes.rowCount === 0) {
            res.status(401).json({ error: { code: 'session_expired', message: 'Invalid or expired session token' } });
            return;
        }
        req.walletAddress = sessionRes.rows[0].wallet_address;
        next();
    }
    catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: { code: 'internal_error', message: 'Authentication verification failed' } });
    }
}
/**
 * Optional auth middleware: sets walletAddress if token provided, but doesn't block unauthenticated requests
 */
export async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.slice(7).trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
        const sessionRes = await query(`SELECT wallet_address, expires_at
       FROM wallet_sessions
       WHERE token_hash = $1 AND expires_at > NOW()
       LIMIT 1`, [tokenHash]);
        if (sessionRes.rowCount !== 0) {
            req.walletAddress = sessionRes.rows[0].wallet_address;
        }
    }
    catch (err) {
        // Ignore error in optional auth
    }
    next();
}
