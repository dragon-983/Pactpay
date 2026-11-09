import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { query, withTransaction } from '../db.js';
import { xlmToStroops, stroopsToXlm } from './projects.js';
const router = Router();
const openDisputeSchema = z.object({
    reason: z.string().min(10).max(2000),
    evidenceNotes: z.string().max(4000).optional(),
    evidenceLinks: z.array(z.string().url()).optional(),
    txHash: z.string().optional(),
});
const resolveDisputeSchema = z.object({
    clientShareXlm: z.string().regex(/^\d+(\.\d{1,7})?$/),
    freelancerShareXlm: z.string().regex(/^\d+(\.\d{1,7})?$/),
    resolutionSummary: z.string().min(10).max(3000),
    txHash: z.string().optional(),
});
// Open dispute
router.post('/projects/:id/disputes', requireAuth, async (req, res) => {
    const caller = req.walletAddress;
    const projectId = req.params.id;
    try {
        const data = openDisputeSchema.parse(req.body);
        const pRes = await query(`SELECT p.*, ea.id as ea_id, ea.status as ea_status
       FROM projects p
       JOIN escrow_agreements ea ON ea.project_id = p.id
       WHERE p.id = $1 AND (p.client_address = $2 OR p.freelancer_address = $2)`, [projectId, caller], caller);
        if (pRes.rowCount === 0) {
            res.status(404).json({ error: { code: 'not_found', message: 'Project or agreement not found' } });
            return;
        }
        const project = pRes.rows[0];
        const result = await withTransaction(async (dbClient) => {
            // 1. Insert dispute
            const dRes = await dbClient.query(`INSERT INTO disputes (
           project_id, escrow_agreement_id, opened_by, reason,
           evidence_notes, evidence_links, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'open')
         RETURNING *`, [
                projectId,
                project.ea_id,
                caller,
                data.reason,
                data.evidenceNotes || '',
                JSON.stringify(data.evidenceLinks || []),
            ]);
            // 2. Freeze agreement and project
            await dbClient.query(`UPDATE projects SET status = 'disputed', updated_at = NOW() WHERE id = $1`, [projectId]);
            await dbClient.query(`UPDATE escrow_agreements SET status = 'disputed', updated_at = NOW() WHERE id = $1`, [project.ea_id]);
            // 3. Notify the counterparty
            const counterparty = caller === project.client_address ? project.freelancer_address : project.client_address;
            await dbClient.query(`INSERT INTO notifications (recipient_address, project_id, type, title, message, link)
         VALUES ($1, $2, 'dispute_opened', $3, $4, $5)`, [
                counterparty,
                projectId,
                'Dispute Opened',
                `A dispute has been opened for "${project.title}". Escrow releases are frozen pending resolution.`,
                `/projects/${projectId}`,
            ]);
            return { dispute: dRes.rows[0] };
        }, caller);
        res.status(201).json({ ok: true, ...result });
    }
    catch (err) {
        res.status(400).json({ error: { code: 'bad_request', message: err.message } });
    }
});
// Arbiter resolves dispute
router.post('/disputes/:id/resolve', requireAuth, async (req, res) => {
    const arbiter = req.walletAddress;
    const disputeId = req.params.id;
    try {
        const data = resolveDisputeSchema.parse(req.body);
        const dRes = await query(`SELECT d.*, ea.arbiter_address, ea.funded_amount_stroops, ea.released_amount_stroops, ea.refunded_amount_stroops,
              p.client_address, p.freelancer_address, p.title as project_title
       FROM disputes d
       JOIN escrow_agreements ea ON ea.id = d.escrow_agreement_id
       JOIN projects p ON p.id = d.project_id
       WHERE d.id = $1`, [disputeId]);
        if (dRes.rowCount === 0) {
            res.status(404).json({ error: { code: 'not_found', message: 'Dispute not found' } });
            return;
        }
        const dispute = dRes.rows[0];
        // Verify authorized arbiter
        if (dispute.arbiter_address !== arbiter) {
            res.status(403).json({ error: { code: 'forbidden', message: 'Only the designated arbiter can resolve this dispute' } });
            return;
        }
        if (dispute.status === 'resolved') {
            res.status(400).json({ error: { code: 'already_resolved', message: 'Dispute has already been resolved' } });
            return;
        }
        const clientShareStroops = xlmToStroops(data.clientShareXlm);
        const freelancerShareStroops = xlmToStroops(data.freelancerShareXlm);
        const remainingStroops = BigInt(dispute.funded_amount_stroops) -
            BigInt(dispute.released_amount_stroops) -
            BigInt(dispute.refunded_amount_stroops);
        if (clientShareStroops + freelancerShareStroops !== remainingStroops) {
            res.status(400).json({
                error: {
                    code: 'amount_mismatch',
                    message: `Split amounts (${stroopsToXlm(clientShareStroops + freelancerShareStroops)} XLM) must equal remaining balance (${stroopsToXlm(remainingStroops)} XLM)`,
                },
            });
            return;
        }
        const result = await withTransaction(async (dbClient) => {
            // 1. Update dispute
            const updatedDRes = await dbClient.query(`UPDATE disputes
         SET status = 'resolved',
             client_share_stroops = $1,
             freelancer_share_stroops = $2,
             resolution_summary = $3,
             resolved_at = NOW()
         WHERE id = $4
         RETURNING *`, [
                clientShareStroops.toString(),
                freelancerShareStroops.toString(),
                data.resolutionSummary,
                disputeId,
            ]);
            // 2. Update escrow_agreements
            await dbClient.query(`UPDATE escrow_agreements
         SET status = 'completed',
             refunded_amount_stroops = refunded_amount_stroops + $1,
             released_amount_stroops = released_amount_stroops + $2,
             updated_at = NOW()
         WHERE id = $3`, [clientShareStroops.toString(), freelancerShareStroops.toString(), dispute.escrow_agreement_id]);
            // 3. Update project status
            await dbClient.query(`UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1`, [dispute.project_id]);
            // 4. Notify both parties
            const msg = `Dispute resolved by arbiter: Client awarded ${data.clientShareXlm} XLM, Freelancer awarded ${data.freelancerShareXlm} XLM.`;
            await dbClient.query(`INSERT INTO notifications (recipient_address, project_id, type, title, message, link)
         VALUES ($1, $2, 'dispute_resolved', 'Dispute Resolved', $3, $4),
                ($5, $2, 'dispute_resolved', 'Dispute Resolved', $3, $4)`, [
                dispute.client_address,
                dispute.project_id,
                msg,
                `/projects/${dispute.project_id}`,
                dispute.freelancer_address,
            ]);
            return { dispute: updatedDRes.rows[0] };
        });
        res.json({ ok: true, ...result });
    }
    catch (err) {
        res.status(400).json({ error: { code: 'bad_request', message: err.message } });
    }
});
export default router;
