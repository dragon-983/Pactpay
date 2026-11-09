#![no_std]
use soroban_sdk::{
    contract, contractimpl, token, Address, Env, String, Vec,
};

pub mod events;
pub mod types;

use crate::events::*;
use crate::types::*;

const LEDGER_THRESHOLD: u32 = 100_000;
const LEDGER_EXTEND_TO: u32 = 200_000;

#[contract]
pub struct PactPayEscrow;

#[contractimpl]
impl PactPayEscrow {
    /// Creates a new milestone escrow agreement in PendingFunding status.
    pub fn create_agreement(
        env: Env,
        agreement_id: u64,
        client: Address,
        freelancer: Address,
        arbiter: Address,
        token: Address,
        total_amount: i128,
        milestones_input: Vec<MilestoneInput>,
        title: String,
    ) -> Result<EscrowAgreement, EscrowError> {
        client.require_auth();

        if total_amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        if milestones_input.is_empty() {
            return Err(EscrowError::ZeroMilestones);
        }

        let key = DataKey::Agreement(agreement_id);
        if env.storage().persistent().has(&key) {
            return Err(EscrowError::AgreementAlreadyExists);
        }

        let mut sum_milestones: i128 = 0;
        let mut milestones: Vec<Milestone> = Vec::new(&env);
        let empty_ref = String::from_str(&env, "");

        for i in 0..milestones_input.len() {
            let m_in = milestones_input.get(i).unwrap();
            if m_in.amount <= 0 {
                return Err(EscrowError::InvalidAmount);
            }

            // Verify unique milestone ID
            for j in 0..milestones.len() {
                if milestones.get(j).unwrap().id == m_in.id {
                    return Err(EscrowError::DuplicateMilestoneId);
                }
            }

            sum_milestones = sum_milestones
                .checked_add(m_in.amount)
                .ok_or(EscrowError::ArithmeticOverflow)?;

            milestones.push_back(Milestone {
                id: m_in.id,
                amount: m_in.amount,
                description: m_in.description,
                status: MilestoneStatus::Pending,
                submission_ref: empty_ref.clone(),
                approved_at: 0,
                paid_at: 0,
            });
        }

        if sum_milestones != total_amount {
            return Err(EscrowError::AmountMismatch);
        }

        let agreement = EscrowAgreement {
            agreement_id,
            client: client.clone(),
            freelancer: freelancer.clone(),
            arbiter: arbiter.clone(),
            token: token.clone(),
            total_amount,
            funded_amount: 0,
            released_amount: 0,
            refunded_amount: 0,
            status: AgreementStatus::PendingFunding,
            milestones,
            created_at: env.ledger().timestamp(),
            title,
        };

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_agreement_created(&env, agreement_id, &client, &freelancer, total_amount);

        Ok(agreement)
    }

    /// Funds the escrow agreement with the agreed total token amount.
    pub fn fund_agreement(
        env: Env,
        agreement_id: u64,
        client: Address,
    ) -> Result<EscrowAgreement, EscrowError> {
        client.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: EscrowAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if agreement.client != client {
            return Err(EscrowError::Unauthorized);
        }

        if agreement.status != AgreementStatus::PendingFunding {
            return Err(EscrowError::InvalidStatus);
        }

        // Transfer funds from client to escrow contract
        let token_client = token::Client::new(&env, &agreement.token);
        token_client.transfer(
            &client,
            &env.current_contract_address(),
            &agreement.total_amount,
        );

        agreement.funded_amount = agreement.total_amount;
        agreement.status = AgreementStatus::Funded;

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_agreement_funded(&env, agreement_id, &client, agreement.total_amount);

        Ok(agreement)
    }

    /// Freelancer submits work for a specific milestone.
    pub fn submit_milestone(
        env: Env,
        agreement_id: u64,
        milestone_id: u32,
        freelancer: Address,
        submission_ref: String,
    ) -> Result<EscrowAgreement, EscrowError> {
        freelancer.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: EscrowAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if agreement.freelancer != freelancer {
            return Err(EscrowError::Unauthorized);
        }

        if agreement.status != AgreementStatus::Funded {
            return Err(EscrowError::InvalidStatus);
        }

        let mut found = false;
        let mut updated_milestones: Vec<Milestone> = Vec::new(&env);

        for i in 0..agreement.milestones.len() {
            let mut m = agreement.milestones.get(i).unwrap();
            if m.id == milestone_id {
                if m.status != MilestoneStatus::Pending
                    && m.status != MilestoneStatus::RevisionRequested
                {
                    return Err(EscrowError::MilestoneInvalidStatus);
                }
                m.status = MilestoneStatus::Submitted;
                m.submission_ref = submission_ref.clone();
                found = true;
            }
            updated_milestones.push_back(m);
        }

        if !found {
            return Err(EscrowError::MilestoneNotFound);
        }

        agreement.milestones = updated_milestones;

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_milestone_submitted(&env, agreement_id, milestone_id, &freelancer, submission_ref);

        Ok(agreement)
    }

    /// Client requests revisions on a submitted milestone with feedback note.
    pub fn request_revision(
        env: Env,
        agreement_id: u64,
        milestone_id: u32,
        client: Address,
        revision_note: String,
    ) -> Result<EscrowAgreement, EscrowError> {
        client.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: EscrowAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if agreement.client != client {
            return Err(EscrowError::Unauthorized);
        }

        if agreement.status != AgreementStatus::Funded {
            return Err(EscrowError::InvalidStatus);
        }

        let mut found = false;
        let mut updated_milestones: Vec<Milestone> = Vec::new(&env);

        for i in 0..agreement.milestones.len() {
            let mut m = agreement.milestones.get(i).unwrap();
            if m.id == milestone_id {
                if m.status != MilestoneStatus::Submitted {
                    return Err(EscrowError::MilestoneInvalidStatus);
                }
                m.status = MilestoneStatus::RevisionRequested;
                found = true;
            }
            updated_milestones.push_back(m);
        }

        if !found {
            return Err(EscrowError::MilestoneNotFound);
        }

        agreement.milestones = updated_milestones;

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_revision_requested(&env, agreement_id, milestone_id, &client, revision_note);

        Ok(agreement)
    }

    /// Client approves milestone and contract releases milestone payment to freelancer.
    pub fn approve_and_release(
        env: Env,
        agreement_id: u64,
        milestone_id: u32,
        client: Address,
    ) -> Result<EscrowAgreement, EscrowError> {
        client.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: EscrowAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if agreement.client != client {
            return Err(EscrowError::Unauthorized);
        }

        if agreement.status != AgreementStatus::Funded {
            return Err(EscrowError::InvalidStatus);
        }

        let mut milestone_amount: i128 = 0;
        let mut found = false;
        let mut all_paid = true;
        let mut updated_milestones: Vec<Milestone> = Vec::new(&env);

        let now = env.ledger().timestamp();

        for i in 0..agreement.milestones.len() {
            let mut m = agreement.milestones.get(i).unwrap();
            if m.id == milestone_id {
                if m.status == MilestoneStatus::Paid {
                    return Err(EscrowError::AlreadyPaid);
                }
                if m.status != MilestoneStatus::Submitted
                    && m.status != MilestoneStatus::RevisionRequested
                {
                    return Err(EscrowError::MilestoneInvalidStatus);
                }
                m.status = MilestoneStatus::Paid;
                m.approved_at = now;
                m.paid_at = now;
                milestone_amount = m.amount;
                found = true;
            }

            if m.status != MilestoneStatus::Paid {
                all_paid = false;
            }

            updated_milestones.push_back(m);
        }

        if !found {
            return Err(EscrowError::MilestoneNotFound);
        }

        // Verify escrow has sufficient remaining balance
        let remaining_balance = agreement
            .funded_amount
            .checked_sub(agreement.released_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?
            .checked_sub(agreement.refunded_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?;

        if remaining_balance < milestone_amount {
            return Err(EscrowError::InsufficientBalance);
        }

        // Transfer funds from contract to freelancer
        let token_client = token::Client::new(&env, &agreement.token);
        token_client.transfer(
            &env.current_contract_address(),
            &agreement.freelancer,
            &milestone_amount,
        );

        agreement.released_amount = agreement
            .released_amount
            .checked_add(milestone_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?;
        agreement.milestones = updated_milestones;

        if all_paid {
            agreement.status = AgreementStatus::Completed;
            emit_agreement_completed(&env, agreement_id);
        }

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_milestone_paid(
            &env,
            agreement_id,
            milestone_id,
            &agreement.freelancer,
            milestone_amount,
        );

        Ok(agreement)
    }

    /// Cancels an unfunded agreement.
    pub fn cancel_agreement(
        env: Env,
        agreement_id: u64,
        client: Address,
    ) -> Result<EscrowAgreement, EscrowError> {
        client.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: EscrowAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if agreement.client != client {
            return Err(EscrowError::Unauthorized);
        }

        if agreement.status != AgreementStatus::PendingFunding {
            return Err(EscrowError::InvalidStatus);
        }

        agreement.status = AgreementStatus::Cancelled;

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_agreement_cancelled(&env, agreement_id, &client);

        Ok(agreement)
    }

    /// Mutual or authorized refund of unreleased escrow balance back to client.
    /// Requires freelancer approval to prevent unilateral client reclaim after work began.
    pub fn refund_agreement(
        env: Env,
        agreement_id: u64,
        client: Address,
        freelancer: Address,
    ) -> Result<EscrowAgreement, EscrowError> {
        client.require_auth();
        freelancer.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: EscrowAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if agreement.client != client || agreement.freelancer != freelancer {
            return Err(EscrowError::Unauthorized);
        }

        if agreement.status != AgreementStatus::Funded {
            return Err(EscrowError::InvalidStatus);
        }

        let refundable_balance = agreement
            .funded_amount
            .checked_sub(agreement.released_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?
            .checked_sub(agreement.refunded_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?;

        if refundable_balance <= 0 {
            return Err(EscrowError::InsufficientBalance);
        }

        // Return remaining funds from contract to client
        let token_client = token::Client::new(&env, &agreement.token);
        token_client.transfer(
            &env.current_contract_address(),
            &client,
            &refundable_balance,
        );

        agreement.refunded_amount = agreement
            .refunded_amount
            .checked_add(refundable_balance)
            .ok_or(EscrowError::ArithmeticOverflow)?;
        agreement.status = AgreementStatus::Refunded;

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_agreement_refunded(&env, agreement_id, &client, refundable_balance);

        Ok(agreement)
    }

    /// Opens a dispute on a funded agreement, freezing further releases until resolved.
    pub fn open_dispute(
        env: Env,
        agreement_id: u64,
        caller: Address,
        reason: String,
    ) -> Result<EscrowAgreement, EscrowError> {
        caller.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: EscrowAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if agreement.client != caller && agreement.freelancer != caller {
            return Err(EscrowError::Unauthorized);
        }

        if agreement.status != AgreementStatus::Funded {
            return Err(EscrowError::InvalidStatus);
        }

        agreement.status = AgreementStatus::Disputed;

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_dispute_opened(&env, agreement_id, &caller, reason);

        Ok(agreement)
    }

    /// Arbiter resolves a dispute by splitting remaining funds between client and freelancer.
    pub fn resolve_dispute(
        env: Env,
        agreement_id: u64,
        arbiter: Address,
        client_amount: i128,
        freelancer_amount: i128,
    ) -> Result<EscrowAgreement, EscrowError> {
        arbiter.require_auth();

        if client_amount < 0 || freelancer_amount < 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: EscrowAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if agreement.arbiter != arbiter {
            return Err(EscrowError::Unauthorized);
        }

        if agreement.status != AgreementStatus::Disputed {
            return Err(EscrowError::DisputeNotActive);
        }

        let remaining_balance = agreement
            .funded_amount
            .checked_sub(agreement.released_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?
            .checked_sub(agreement.refunded_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?;

        let total_split = client_amount
            .checked_add(freelancer_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?;

        if total_split != remaining_balance {
            return Err(EscrowError::AmountMismatch);
        }

        let token_client = token::Client::new(&env, &agreement.token);

        if client_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &agreement.client,
                &client_amount,
            );
            agreement.refunded_amount = agreement
                .refunded_amount
                .checked_add(client_amount)
                .ok_or(EscrowError::ArithmeticOverflow)?;
        }

        if freelancer_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &agreement.freelancer,
                &freelancer_amount,
            );
            agreement.released_amount = agreement
                .released_amount
                .checked_add(freelancer_amount)
                .ok_or(EscrowError::ArithmeticOverflow)?;
        }

        agreement.status = AgreementStatus::Completed;

        env.storage().persistent().set(&key, &agreement);
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_EXTEND_TO);

        emit_dispute_resolved(
            &env,
            agreement_id,
            &arbiter,
            client_amount,
            freelancer_amount,
        );

        Ok(agreement)
    }

    /// Read agreement state.
    pub fn get_agreement(env: Env, agreement_id: u64) -> Result<EscrowAgreement, EscrowError> {
        let key = DataKey::Agreement(agreement_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)
    }

    /// Read specific milestone state.
    pub fn get_milestone(
        env: Env,
        agreement_id: u64,
        milestone_id: u32,
    ) -> Result<Milestone, EscrowError> {
        let agreement = Self::get_agreement(env, agreement_id)?;
        for i in 0..agreement.milestones.len() {
            let m = agreement.milestones.get(i).unwrap();
            if m.id == milestone_id {
                return Ok(m);
            }
        }
        Err(EscrowError::MilestoneNotFound)
    }

    /// Read remaining unreleased escrow balance.
    pub fn get_remaining_balance(env: Env, agreement_id: u64) -> Result<i128, EscrowError> {
        let agreement = Self::get_agreement(env, agreement_id)?;
        let balance = agreement
            .funded_amount
            .checked_sub(agreement.released_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?
            .checked_sub(agreement.refunded_amount)
            .ok_or(EscrowError::ArithmeticOverflow)?;
        Ok(balance)
    }
}

#[cfg(test)]
mod test;
