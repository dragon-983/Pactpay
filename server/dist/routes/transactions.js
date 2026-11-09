import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { query, withTransaction } from '../db.js';
import { verifyOnChainTransaction } from '../stellar.js';
import { xlmToStroops } from './projects.js';
const router = Router();
const verifyTxSchema = z.object({
    txHash: z.string().length(64),
    projectId: z.string().uuid().optional(),
    txType: z.enum([
        'create_agreement',
        'fund_escrow',
        'submit_work',
        'request_revision',
        'approve_release',
        'cancel',
        'refund',
        'open_dispute',
        'resolve_dispute',
    ]),
    amountXlm: z.string().regex(/^\d+(\.\d{1,7})?$/).optional(),
    contractId: z.string().optional(),
});
// Submit and independently verify an on-chain transaction
router.post('/verify', requireAuth, async (req, res) => {
    const caller = req.walletAddress;
    try {
        const data = verifyTxSchema.parse(req.body);
        // 1. Check if transaction was already processed
        const existing = await query('SELECT * FROM transactions WHERE tx_hash = $1', [data.txHash]);
        if (existing.rowCount > 0 && existing.rows[0].status === 'confirmed') {
            res.json({
                ok: true,
                alreadyProcessed: true,
                transaction: existing.rows[0],
            });
            return;
        }
        // 2. Independently verify transaction on Stellar Soroban RPC / Horizon
        const verified = await verifyOnChainTransaction(data.txHash);
        if (!verified.successful) {
            res.status(400).json({
                error: {
                    code: 'verification_failed',
                    message: verified.error || 'Transaction verification failed on Stellar Testnet',
                },
            });
            return;
        }
        const amountStroops = data.amountXlm ? xlmToStroops(data.amountXlm) : null;
        // 3. Record transaction and update state
        const result = await withTransaction(async (dbClient) => {
            // Upsert transaction
            const txRes = await dbClient.query(`INSERT INTO transactions (
           project_id, tx_hash, tx_type, from_address, to_address,
           amount_stroops, amount_xlm, status, ledger_sequence, confirmed_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, NOW())
         ON CONFLICT (tx_hash) DO UPDATE
         SET status = 'confirmed', ledger_sequence = $8, confirmed_at = NOW()
         RETURNING *`, [
                data.projectId || null,
                data.txHash,
                data.txType,
                caller,
                data.contractId || null,
                amountStroops ? amountStroops.toString() : null,
                data.amountXlm || null,
                verified.ledger,
            ]);
            // Handle type-specific reconciliation
            if (data.projectId && data.txType === 'fund_escrow') {
                await dbClient.query(`UPDATE projects SET status = 'funded', updated_at = NOW() WHERE id = $1`, [data.projectId]);
                if (amountStroops) {
                    await dbClient.query(`UPDATE escrow_agreements
             SET status = 'funded',
                 funded_amount_stroops = $1,
                 contract_address = COALESCE(NULLIF($2, ''), contract_address),
                 updated_at = NOW()
             WHERE project_id = $3`, [amountStroops.toString(), data.contractId || '', data.projectId]);
                }
            }
            return txRes.rows[0];
        }, caller);
        res.json({
            ok: true,
            verified: true,
            ledger: verified.ledger,
            transaction: result,
        });
    }
    catch (err) {
        res.status(400).json({ error: { code: 'bad_request', message: err.message } });
    }
});
// List transactions
router.get('/', requireAuth, async (req, res) => {
    const caller = req.walletAddress;
    const projectId = req.query.projectId;
    try {
        let queryText = `
      SELECT t.*, p.title as project_title
      FROM transactions t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE (t.from_address = $1 OR p.client_address = $1 OR p.freelancer_address = $1)
    `;
        const params = [caller];
        if (projectId) {
            queryText += ` AND t.project_id = $2`;
            params.push(projectId);
        }
        queryText += ` ORDER BY t.created_at DESC LIMIT 50`;
        const txRes = await query(queryText, params, caller);
        res.json({ ok: true, transactions: txRes.rows });
    }
    catch (err) {
        res.status(500).json({ error: { code: 'internal_error', message: err.message } });
    }
});
export default router;
