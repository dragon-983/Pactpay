-- PactPay Migration 002: Complete Row Level Security Policies for Escrow & Settlement

-- 1. Escrow Agreements
DROP POLICY IF EXISTS agreements_insert ON escrow_agreements;
DROP POLICY IF EXISTS agreements_update ON escrow_agreements;
CREATE POLICY agreements_insert ON escrow_agreements FOR INSERT WITH CHECK (
  client_address = current_wallet() OR current_wallet() IS NULL
);

CREATE POLICY agreements_update ON escrow_agreements FOR UPDATE USING (
  client_address = current_wallet() OR freelancer_address = current_wallet() OR arbiter_address = current_wallet() OR current_wallet() IS NULL
);

-- 2. Milestones
DROP POLICY IF EXISTS milestones_insert ON milestones;
DROP POLICY IF EXISTS milestones_update ON milestones;
CREATE POLICY milestones_insert ON milestones FOR INSERT WITH CHECK (true);
CREATE POLICY milestones_update ON milestones FOR UPDATE USING (true);

-- 3. Disputes
DROP POLICY IF EXISTS disputes_insert ON disputes;
DROP POLICY IF EXISTS disputes_update ON disputes;
CREATE POLICY disputes_insert ON disputes FOR INSERT WITH CHECK (
  opened_by = current_wallet() OR current_wallet() IS NULL
);
CREATE POLICY disputes_update ON disputes FOR UPDATE USING (true);

-- 4. Transactions
DROP POLICY IF EXISTS transactions_insert ON transactions;
DROP POLICY IF EXISTS transactions_update ON transactions;
CREATE POLICY transactions_insert ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY transactions_update ON transactions FOR UPDATE USING (true);

-- 5. Wallet Sessions
DROP POLICY IF EXISTS wallet_sessions_all ON wallet_sessions;
CREATE POLICY wallet_sessions_all ON wallet_sessions FOR ALL USING (true);

-- 6. Audit Events
DROP POLICY IF EXISTS audit_events_all ON audit_events;
CREATE POLICY audit_events_all ON audit_events FOR ALL USING (true);

