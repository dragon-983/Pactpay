import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { query, withTransaction } from '../db.js';
const router = Router();
const submitWorkSchema = z.object({
    submissionRef: z.string().min(1).max(500),
    notes: z.string().max(2000).optional(),
    githubUrl: z.string().url().optional().or(z.literal('')),
    previewUrl: z.string().url().optional().or(z.literal('')),
    deliverableFiles: z.array(z.object({
        name: z.string(),
        url: z.string(),
        hash: z.string().optional(),
        size: z.number().optional(),
    })).optional(),
    txHash: z.string().optional(),
});
const requestRevisionSchema = z.object({
    revisionNotes: z.string().min(5).max(2000),
    txHash: z.string().optional(),
});
const approveMilestoneSchema = z.object({
    txHash: z.string().optional(),
});
// Freelancer submits milestone deliverables
router.post('/:id/submit', requireAuth, async (req, res) => {
    const freelancer = req.walletAddress;
    const milestoneId = req.params.id;
    try {
        const data = submitWorkSchema.parse(req.body);
        const mRes = await query(`SELECT m.*, p.client_address, p.freelancer_address, p.title as project_title, p.id as p_id
       FROM milestones m
       JOIN projects p ON p.id = m.project_id
       WHERE m.id = $1`, [milestoneId], freelancer);
        if (mRes.rowCount === 0) {
            res.status(404).json({ error: { code: 'not_found', message: 'Milestone not found' } });
            return;
        }
        const milestone = mRes.rows[0];
        if (milestone.freelancer_address !== freelancer) {
            res.status(403).json({ error: { code: 'forbidden', message: 'Only the assigned freelancer can submit work' } });
            return;
        }
        if (milestone.status === 'paid') {
            res.status(400).json({ error: { code: 'already_paid', message: 'This milestone has already been approved and paid' } });
            return;
        }
        const result = await withTransaction(async (client) => {
            // 1. Insert submission
            const subRes = await client.query(`INSERT INTO work_submissions (
           milestone_id, freelancer_address, submission_ref,
           notes, github_url, preview_url, deliverable_files, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted')
         RETURNING *`, [
                milestoneId,
                freelancer,
                data.submissionRef,
                data.notes || '',
                data.githubUrl || null,
                data.previewUrl || null,
                JSON.stringify(data.deliverableFiles || []),
            ]);
            // 2. Update milestone status
            const updatedMRes = await client.query(`UPDATE milestones
         SET status = 'submitted', updated_at = NOW()
         WHERE id = $1
         RETURNING *`, [milestoneId]);
            // 3. Notify client
            await client.query(`INSERT INTO notifications (recipient_address, project_id, type, title, message, link)
         VALUES ($1, $2, 'milestone_submitted', $3, $4, $5)`, [
                milestone.client_address,
                milestone.p_id,
                'Work Submitted for Review',
                `Freelancer submitted work for milestone "${milestone.title}" on "${milestone.project_title}".`,
                `/projects/${milestone.p_id}`,
            ]);
            return { submission: subRes.rows[0], milestone: updatedMRes.rows[0] };
        }, freelancer);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        res.status(400).json({ error: { code: 'bad_request', message: err.message } });
    }
});
// Client requests revisions
router.post('/:id/revision', requireAuth, async (req, res) => {
    const clientWallet = req.walletAddress;
    const milestoneId = req.params.id;
    try {
        const data = requestRevisionSchema.parse(req.body);
        const mRes = await query(`SELECT m.*, p.client_address, p.freelancer_address, p.title as project_title, p.id as p_id
       FROM milestones m
       JOIN projects p ON p.id = m.project_id
       WHERE m.id = $1`, [milestoneId], clientWallet);
        if (mRes.rowCount === 0) {
            res.status(404).json({ error: { code: 'not_found', message: 'Milestone not found' } });
            return;
        }
        const milestone = mRes.rows[0];
        if (milestone.client_address !== clientWallet) {
            res.status(403).json({ error: { code: 'forbidden', message: 'Only the project client can request revisions' } });
            return;
        }
        const result = await withTransaction(async (dbClient) => {
            // 1. Update latest submission review notes
            await dbClient.query(`UPDATE work_submissions
         SET status = 'revision_requested', review_notes = $1, updated_at = NOW()
         WHERE id = (
           SELECT id FROM work_submissions
           WHERE milestone_id = $2
           ORDER BY created_at DESC
           LIMIT 1
         )`, [data.revisionNotes, milestoneId]);
            // 2. Update milestone status
            const updatedMRes = await dbClient.query(`UPDATE milestones
         SET status = 'revision_requested', updated_at = NOW()
         WHERE id = $1
         RETURNING *`, [milestoneId]);
            // 3. Notify freelancer
            await dbClient.query(`INSERT INTO notifications (recipient_address, project_id, type, title, message, link)
         VALUES ($1, $2, 'revision_requested', $3, $4, $5)`, [
                milestone.freelancer_address,
                milestone.p_id,
                'Revision Requested',
                `Client requested revisions on milestone "${milestone.title}": "${data.revisionNotes.slice(0, 100)}..."`,
                `/projects/${milestone.p_id}`,
            ]);
            return { milestone: updatedMRes.rows[0] };
        }, clientWallet);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        res.status(400).json({ error: { code: 'bad_request', message: err.message } });
    }
});
// Client approves milestone and releases payment
router.post('/:id/approve', requireAuth, async (req, res) => {
    const clientWallet = req.walletAddress;
    const milestoneId = req.params.id;
    try {
        const data = approveMilestoneSchema.parse(req.body);
        const mRes = await query(`SELECT m.*, p.client_address, p.freelancer_address, p.title as project_title, p.id as p_id
       FROM milestones m
       JOIN projects p ON p.id = m.project_id
       WHERE m.id = $1`, [milestoneId], clientWallet);
        if (mRes.rowCount === 0) {
            res.status(404).json({ error: { code: 'not_found', message: 'Milestone not found' } });
            return;
        }
        const milestone = mRes.rows[0];
        if (milestone.client_address !== clientWallet) {
            res.status(403).json({ error: { code: 'forbidden', message: 'Only the project client can approve milestones' } });
            return;
        }
        if (milestone.status === 'paid') {
            res.status(400).json({ error: { code: 'already_paid', message: 'Milestone is already paid' } });
            return;
        }
        const result = await withTransaction(async (dbClient) => {
            // 1. Update submission status to approved
            await dbClient.query(`UPDATE work_submissions
         SET status = 'approved', updated_at = NOW()
         WHERE id = (
           SELECT id FROM work_submissions
           WHERE milestone_id = $1
           ORDER BY created_at DESC
           LIMIT 1
         )`, [milestoneId]);
            // 2. Mark milestone as paid
            const updatedMRes = await dbClient.query(`UPDATE milestones
         SET status = 'paid', paid_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING *`, [milestoneId]);
            // 3. Update escrow_agreements released amount
            await dbClient.query(`UPDATE escrow_agreements
         SET released_amount_stroops = released_amount_stroops + $1, updated_at = NOW()
         WHERE project_id = $2`, [milestone.amount_stroops, milestone.p_id]);
            // 4. Check if all milestones are paid
            const remainingUnpaid = await dbClient.query(`SELECT COUNT(*) FROM milestones WHERE project_id = $1 AND status != 'paid'`, [milestone.p_id]);
            let allCompleted = false;
            if (parseInt(remainingUnpaid.rows[0].count, 10) === 0) {
                allCompleted = true;
                await dbClient.query(`UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1`, [milestone.p_id]);
                await dbClient.query(`UPDATE escrow_agreements SET status = 'completed', updated_at = NOW() WHERE project_id = $1`, [milestone.p_id]);
            }
            // 5. Notify freelancer of payment release
            await dbClient.query(`INSERT INTO notifications (recipient_address, project_id, type, title, message, link)
         VALUES ($1, $2, 'milestone_paid', $3, $4, $5)`, [
                milestone.freelancer_address,
                milestone.p_id,
                'Milestone Approved & Paid!',
                `Payment of ${milestone.amount_xlm} XLM for "${milestone.title}" has been released to your wallet.`,
                `/projects/${milestone.p_id}`,
            ]);
            return { milestone: updatedMRes.rows[0], allCompleted };
        }, clientWallet);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        res.status(400).json({ error: { code: 'bad_request', message: err.message } });
    }
});
export default router;
