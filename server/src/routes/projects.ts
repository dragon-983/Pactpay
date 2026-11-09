import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../auth.js';
import { query, withTransaction } from '../db.js';
import { isValidStellarAddress } from '../stellar.js';
import { config } from '../config.js';

const router = Router();

const milestoneInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  amountXlm: z.string().regex(/^\d+(\.\d{1,7})?$/),
  deadline: z.string().optional(),
});

const createProjectSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  freelancerAddress: z.string().min(56).max(56),
  tokenSymbol: z.string().default('XLM'),
  tokenAddress: z.string().default(config.nativeTokenAddress),
  arbiterAddress: z.string().default(config.platformArbiterAddress),
  milestones: z.array(milestoneInputSchema).min(1).max(20),
});

// Helper to convert XLM string to BigInt stroops
export function xlmToStroops(val: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(val.trim());
  if (!match) throw new Error(`Invalid XLM amount: ${val}`);
  const whole = BigInt(match[1]);
  const fraction = (match[2] || '').padEnd(7, '0');
  return whole * 10_000_000n + BigInt(fraction);
}

// Helper to convert stroops to XLM string
export function stroopsToXlm(stroops: bigint | string | number): string {
  const s = BigInt(stroops);
  const whole = s / 10_000_000n;
  const fraction = (s % 10_000_000n).toString().padStart(7, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}.0`;
}

// List user's projects (client or freelancer)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const wallet = req.walletAddress!;
  const roleFilter = req.query.role as string | undefined;

  try {
    let whereClause = '(client_address = $1 OR freelancer_address = $1)';
    const params: any[] = [wallet];

    if (roleFilter === 'client') {
      whereClause = 'client_address = $1';
    } else if (roleFilter === 'freelancer') {
      whereClause = 'freelancer_address = $1';
    }

    const projectsRes = await query(
      `SELECT p.*,
              ea.contract_address,
              ea.onchain_agreement_id,
              ea.funded_amount_stroops,
              ea.released_amount_stroops,
              ea.refunded_amount_stroops,
              (SELECT COUNT(*) FROM milestones m WHERE m.project_id = p.id) as milestone_count,
              (SELECT COUNT(*) FROM milestones m WHERE m.project_id = p.id AND m.status = 'paid') as completed_milestone_count
       FROM projects p
       LEFT JOIN escrow_agreements ea ON ea.project_id = p.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC`,
      params,
      wallet
    );

    res.json({ ok: true, projects: projectsRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'internal_error', message: err.message } });
  }
});

// Create a new project with milestones and agreement link
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const clientAddress = req.walletAddress!;

  try {
    const data = createProjectSchema.parse(req.body);

    if (!isValidStellarAddress(data.freelancerAddress)) {
      res.status(400).json({ error: { code: 'bad_request', message: 'Invalid freelancer Stellar address' } });
      return;
    }

    if (clientAddress === data.freelancerAddress) {
      res.status(400).json({ error: { code: 'bad_request', message: 'Client and freelancer addresses cannot be the same' } });
      return;
    }

    // Ensure freelancer profile stub exists
    await query(
      `INSERT INTO profiles (wallet_address, name)
       VALUES ($1, $2)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [data.freelancerAddress, data.freelancerAddress.slice(0, 4) + '...' + data.freelancerAddress.slice(-4)]
    );

    // Calculate total budget in stroops
    let totalBudgetStroops = 0n;
    const parsedMilestones = data.milestones.map((m, idx) => {
      const stroops = xlmToStroops(m.amountXlm);
      if (stroops <= 0n) throw new Error('Milestone amount must be positive');
      totalBudgetStroops += stroops;
      return {
        onchainMilestoneId: idx + 1,
        title: m.title,
        description: m.description || '',
        amountStroops: stroops,
        amountXlm: m.amountXlm,
        deadline: m.deadline ? new Date(m.deadline) : null,
      };
    });

    const totalBudgetXlm = stroopsToXlm(totalBudgetStroops);

    const projectResult = await withTransaction(async (dbClient) => {
      // 1. Insert project
      const pRes = await dbClient.query(
        `INSERT INTO projects (
           title, description, client_address, freelancer_address,
           token_symbol, token_address, total_budget, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_funding')
         RETURNING *`,
        [
          data.title,
          data.description,
          clientAddress,
          data.freelancerAddress,
          data.tokenSymbol,
          data.tokenAddress,
          totalBudgetXlm,
        ]
      );
      const project = pRes.rows[0];

      // 2. Generate onchain agreement ID (timestamp + numeric random)
      const onchainAgreementId = BigInt(Date.now());

      // 3. Insert escrow_agreements record
      const eaRes = await dbClient.query(
        `INSERT INTO escrow_agreements (
           project_id, contract_address, onchain_agreement_id,
           client_address, freelancer_address, arbiter_address,
           token_address, total_amount_stroops, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_funding')
         RETURNING *`,
        [
          project.id,
          config.escrowContractId || 'PENDING_DEPLOYMENT',
          onchainAgreementId.toString(),
          clientAddress,
          data.freelancerAddress,
          data.arbiterAddress,
          data.tokenAddress,
          totalBudgetStroops.toString(),
        ]
      );
      const agreement = eaRes.rows[0];

      // 4. Insert milestones
      const milestones = [];
      for (const m of parsedMilestones) {
        const mRes = await dbClient.query(
          `INSERT INTO milestones (
             project_id, onchain_milestone_id, title, description,
             amount_stroops, amount_xlm, status, deadline
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
           RETURNING *`,
          [
            project.id,
            m.onchainMilestoneId,
            m.title,
            m.description,
            m.amountStroops.toString(),
            m.amountXlm,
            m.deadline,
          ]
        );
        milestones.push(mRes.rows[0]);
      }

      // 5. Create notification for freelancer
      await dbClient.query(
        `INSERT INTO notifications (recipient_address, project_id, type, title, message, link)
         VALUES ($1, $2, 'project_created', $3, $4, $5)`,
        [
          data.freelancerAddress,
          project.id,
          'New Project Invitation',
          `You have been invited to collaborate on "${project.title}" (${totalBudgetXlm} ${data.tokenSymbol}).`,
          `/projects/${project.id}`,
        ]
      );

      return { project, agreement, milestones };
    }, clientAddress);

    res.status(201).json({ ok: true, ...projectResult });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'bad_request', message: err.message } });
  }
});

// Get single project details with milestones, agreement, and submissions
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const wallet = req.walletAddress!;
  const { id } = req.params;

  try {
    const pRes = await query(
      `SELECT p.*,
              c.name as client_name, c.avatar_url as client_avatar,
              f.name as freelancer_name, f.avatar_url as freelancer_avatar
       FROM projects p
       LEFT JOIN profiles c ON c.wallet_address = p.client_address
       LEFT JOIN profiles f ON f.wallet_address = p.freelancer_address
       WHERE p.id = $1 AND (p.client_address = $2 OR p.freelancer_address = $2)`,
      [id, wallet],
      wallet
    );

    if (pRes.rowCount === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Project not found or unauthorized' } });
      return;
    }

    const project = pRes.rows[0];

    // Fetch escrow agreement
    const eaRes = await query(
      `SELECT * FROM escrow_agreements WHERE project_id = $1`,
      [id],
      wallet
    );

    // Fetch milestones with submissions
    const mRes = await query(
      `SELECT m.*,
              (
                SELECT json_agg(ws ORDER BY ws.created_at DESC)
                FROM work_submissions ws
                WHERE ws.milestone_id = m.id
              ) as submissions
       FROM milestones m
       WHERE m.project_id = $1
       ORDER BY m.onchain_milestone_id ASC`,
      [id],
      wallet
    );

    // Fetch any disputes
    const dRes = await query(
      `SELECT * FROM disputes WHERE project_id = $1 ORDER BY created_at DESC`,
      [id],
      wallet
    );

    res.json({
      ok: true,
      project,
      agreement: eaRes.rows[0] || null,
      milestones: mRes.rows,
      disputes: dRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'internal_error', message: err.message } });
  }
});

export default router;

