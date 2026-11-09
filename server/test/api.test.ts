process.env.NODE_ENV = 'test';

import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import { createApp } from '../src/app.js';
import { createPool, query } from '../src/db.js';
import { setMockServers } from '../src/stellar.js';
import { config } from '../src/config.js';
import type { Server } from 'node:http';

let server: Server;
let baseUrl: string;
const testPool = createPool(config.testDatabaseUrl);

// Test Stellar Keypairs
const clientKeypair = Keypair.random();
const freelancerKeypair = Keypair.random();
const arbiterKeypair = Keypair.random();

const clientWallet = clientKeypair.publicKey();
const freelancerWallet = freelancerKeypair.publicKey();
const arbiterWallet = arbiterKeypair.publicKey();

let clientToken: string;
let freelancerToken: string;
let arbiterToken: string;

before(async () => {
  const app = createApp({ rateLimits: false });
  server = app.listen(0);
  const addr: any = server.address();
  baseUrl = `http://localhost:${addr.port}/api`;
});

after(async () => {
  server.close();
  await testPool.end();
});

beforeEach(async () => {
  // Wipe test database
  await testPool.query(`
    TRUNCATE profiles, wallet_sessions, projects, escrow_agreements,
             milestones, work_submissions, disputes, transactions,
             notifications, audit_events CASCADE
  `);
});

// Helper for authenticated HTTP requests
async function req(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

// Sign-in helper
async function authenticateWallet(keypair: Keypair): Promise<string> {
  const walletAddress = keypair.publicKey();
  const challengeRes = await req('POST', '/auth/challenge', { walletAddress });
  assert.equal(challengeRes.status, 200);
  const nonce = challengeRes.data.nonce;

  // Sign nonce with Stellar Keypair
  const signatureBuffer = keypair.sign(Buffer.from(nonce, 'utf-8'));
  const signature = signatureBuffer.toString('base64');

  const verifyRes = await req('POST', '/auth/verify', {
    walletAddress,
    nonce,
    signature,
  });
  assert.equal(verifyRes.status, 200);
  assert.ok(verifyRes.data.token);
  return verifyRes.data.token;
}

test('GET /api/health reports healthy database and testnet network', async () => {
  const res = await req('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
  assert.equal(res.data.status, 'healthy');
  assert.equal(res.data.network, 'testnet');
});

test('Wallet challenge-response authentication with Stellar keypairs', async () => {
  // 1. Client auth
  clientToken = await authenticateWallet(clientKeypair);
  assert.ok(clientToken.length > 20);

  // 2. Fetch authenticated profile
  const meRes = await req('GET', '/auth/me', undefined, clientToken);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.data.walletAddress, clientWallet);

  // 3. Update profile
  const updateRes = await req('PUT', '/profiles/me', {
    name: 'Alice Client',
    bio: 'Fintech Founder',
    role: 'client',
  }, clientToken);
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.profile.name, 'Alice Client');
  assert.equal(updateRes.data.profile.bio, 'Fintech Founder');
});

test('Full Project & Escrow Lifecycle: creation, submissions, revisions, and approval', async () => {
  clientToken = await authenticateWallet(clientKeypair);
  freelancerToken = await authenticateWallet(freelancerKeypair);

  // 1. Create project with 2 milestones
  const createRes = await req('POST', '/projects', {
    title: 'DeFi Escrow Integration',
    description: 'Build a decentralized escrow milestone flow on Stellar Testnet',
    freelancerAddress: freelancerWallet,
    milestones: [
      { title: 'Smart Contract & Tests', amountXlm: '600', description: 'Soroban contract' },
      { title: 'Frontend Interface', amountXlm: '400', description: 'React dashboard' },
    ],
  }, clientToken);

  assert.equal(createRes.status, 201);
  assert.equal(createRes.data.project.title, 'DeFi Escrow Integration');
  assert.equal(createRes.data.milestones.length, 2);
  const projectId = createRes.data.project.id;
  const milestone1Id = createRes.data.milestones[0].id;
  const milestone2Id = createRes.data.milestones[1].id;

  // 2. Read single project details
  const getRes = await req('GET', `/projects/${projectId}`, undefined, clientToken);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.data.milestones.length, 2);

  // 3. Freelancer submits work for Milestone 1
  const submitRes = await req('POST', `/milestones/${milestone1Id}/submit`, {
    submissionRef: 'https://github.com/pactpay/escrow/pull/1',
    notes: 'Contract implemented and all Soroban unit tests passing',
    githubUrl: 'https://github.com/pactpay/escrow',
  }, freelancerToken);

  assert.equal(submitRes.status, 200);
  assert.equal(submitRes.data.milestone.status, 'submitted');

  // Unauthorized client cannot submit milestone
  const unauthorizedSubmit = await req('POST', `/milestones/${milestone2Id}/submit`, {
    submissionRef: 'bad_url',
  }, clientToken);
  assert.equal(unauthorizedSubmit.status, 403);

  // 4. Client requests revision on Milestone 1
  const revisionRes = await req('POST', `/milestones/${milestone1Id}/revision`, {
    revisionNotes: 'Please add events for dispute resolution before approval',
  }, clientToken);

  assert.equal(revisionRes.status, 200);
  assert.equal(revisionRes.data.milestone.status, 'revision_requested');

  // 5. Freelancer resubmits
  const resubmitRes = await req('POST', `/milestones/${milestone1Id}/submit`, {
    submissionRef: 'https://github.com/pactpay/escrow/pull/2',
    notes: 'Dispute events added and verified',
  }, freelancerToken);
  assert.equal(resubmitRes.status, 200);
  assert.equal(resubmitRes.data.milestone.status, 'submitted');

  // 6. Client approves Milestone 1
  const approveRes = await req('POST', `/milestones/${milestone1Id}/approve`, {}, clientToken);
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.data.milestone.status, 'paid');
  assert.equal(approveRes.data.allCompleted, false);

  // Non-client cannot approve
  const badApprove = await req('POST', `/milestones/${milestone2Id}/approve`, {}, freelancerToken);
  assert.equal(badApprove.status, 403);

  // Cannot re-approve an already paid milestone
  const dupApprove = await req('POST', `/milestones/${milestone1Id}/approve`, {}, clientToken);
  assert.equal(dupApprove.status, 400);

  // 7. Check Freelancer Notifications
  const notifRes = await req('GET', '/notifications', undefined, freelancerToken);
  assert.equal(notifRes.status, 200);
  assert.ok(notifRes.data.notifications.length >= 2);
});

test('Dispute Workflow: opening and arbiter resolution', async () => {
  clientToken = await authenticateWallet(clientKeypair);
  freelancerToken = await authenticateWallet(freelancerKeypair);
  arbiterToken = await authenticateWallet(arbiterKeypair);

  // Create project with arbiter
  const createRes = await req('POST', '/projects', {
    title: 'Disputed App Build',
    description: 'Contract project to test dispute resolution',
    freelancerAddress: freelancerWallet,
    arbiterAddress: arbiterWallet,
    milestones: [
      { title: 'Deliverable 1', amountXlm: '1000' },
    ],
  }, clientToken);

  const projectId = createRes.data.project.id;

  // Fake fund the escrow for dispute testing
  await testPool.query(
    `UPDATE escrow_agreements
     SET funded_amount_stroops = 10000000000, arbiter_address = $1
     WHERE project_id = $2`,
    [arbiterWallet, projectId]
  );

  // Freelancer opens dispute
  const openRes = await req('POST', `/projects/${projectId}/disputes`, {
    reason: 'Client requested out-of-scope work without amending agreement budget',
    evidenceNotes: 'Communication logs attached',
  }, freelancerToken);

  assert.equal(openRes.status, 201);
  assert.equal(openRes.data.dispute.status, 'open');
  const disputeId = openRes.data.dispute.id;

  // Check project status changed to disputed
  const pCheck = await req('GET', `/projects/${projectId}`, undefined, clientToken);
  assert.equal(pCheck.data.project.status, 'disputed');

  // Non-arbiter cannot resolve
  const badResolve = await req('POST', `/disputes/${disputeId}/resolve`, {
    clientShareXlm: '400',
    freelancerShareXlm: '600',
    resolutionSummary: 'Unauthorized resolution attempt',
  }, clientToken);
  assert.equal(badResolve.status, 403);

  // Mismatched amount split rejected
  const mismatchResolve = await req('POST', `/disputes/${disputeId}/resolve`, {
    clientShareXlm: '300',
    freelancerShareXlm: '300', // sum 600 != 1000
    resolutionSummary: 'Incomplete split',
  }, arbiterToken);
  assert.equal(mismatchResolve.status, 400);

  // Arbiter successfully resolves: 400 XLM to Client, 600 XLM to Freelancer
  const resolveRes = await req('POST', `/disputes/${disputeId}/resolve`, {
    clientShareXlm: '400',
    freelancerShareXlm: '600',
    resolutionSummary: 'Arbiter review determined 60% of deliverables were achieved.',
  }, arbiterToken);

  assert.equal(resolveRes.status, 200);
  assert.equal(resolveRes.data.dispute.status, 'resolved');
});

test('Independent Transaction Verification: mock Soroban RPC and prevent replays', async () => {
  clientToken = await authenticateWallet(clientKeypair);

  // Mock Soroban Server response
  const fakeTxHash = 'a'.repeat(64);
  const mockSoroban = {
    getTransaction: async (hash: string) => ({
      status: 'SUCCESS',
      latestLedger: 123456,
      hash,
    }),
  };

  setMockServers(null, mockSoroban as any);

  // Submit and verify transaction
  const verifyRes = await req('POST', '/transactions/verify', {
    txHash: fakeTxHash,
    txType: 'fund_escrow',
    amountXlm: '500',
  }, clientToken);

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.data.verified, true);
  assert.equal(verifyRes.data.ledger, 123456);

  // Replaying the exact same transaction hash returns alreadyProcessed
  const replayRes = await req('POST', '/transactions/verify', {
    txHash: fakeTxHash,
    txType: 'fund_escrow',
    amountXlm: '500',
  }, clientToken);

  assert.equal(replayRes.status, 200);
  assert.equal(replayRes.data.alreadyProcessed, true);

  setMockServers(null, null);
});
