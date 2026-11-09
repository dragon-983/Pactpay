use soroban_sdk::{symbol_short, Address, Env, String};

pub fn emit_agreement_created(
    env: &Env,
    agreement_id: u64,
    client: &Address,
    freelancer: &Address,
    total_amount: i128,
) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("create"), agreement_id),
        (client.clone(), freelancer.clone(), total_amount),
    );
}

pub fn emit_agreement_funded(
    env: &Env,
    agreement_id: u64,
    client: &Address,
    amount: i128,
) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("funded"), agreement_id),
        (client.clone(), amount),
    );
}

pub fn emit_milestone_submitted(
    env: &Env,
    agreement_id: u64,
    milestone_id: u32,
    freelancer: &Address,
    submission_ref: String,
) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("submit"), agreement_id),
        (milestone_id, freelancer.clone(), submission_ref),
    );
}

pub fn emit_revision_requested(
    env: &Env,
    agreement_id: u64,
    milestone_id: u32,
    client: &Address,
    note: String,
) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("revision"), agreement_id),
        (milestone_id, client.clone(), note),
    );
}

pub fn emit_milestone_paid(
    env: &Env,
    agreement_id: u64,
    milestone_id: u32,
    freelancer: &Address,
    amount: i128,
) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("paid"), agreement_id),
        (milestone_id, freelancer.clone(), amount),
    );
}

pub fn emit_agreement_completed(env: &Env, agreement_id: u64) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("complete"), agreement_id),
        agreement_id,
    );
}

pub fn emit_agreement_cancelled(env: &Env, agreement_id: u64, client: &Address) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("cancel"), agreement_id),
        client.clone(),
    );
}

pub fn emit_agreement_refunded(
    env: &Env,
    agreement_id: u64,
    client: &Address,
    refund_amount: i128,
) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("refund"), agreement_id),
        (client.clone(), refund_amount),
    );
}

pub fn emit_dispute_opened(
    env: &Env,
    agreement_id: u64,
    opener: &Address,
    reason: String,
) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("dispute"), agreement_id),
        (opener.clone(), reason),
    );
}

pub fn emit_dispute_resolved(
    env: &Env,
    agreement_id: u64,
    arbiter: &Address,
    client_amount: i128,
    freelancer_amount: i128,
) {
    env.events().publish(
        (symbol_short!("pactpay"), symbol_short!("resolved"), agreement_id),
        (arbiter.clone(), client_amount, freelancer_amount),
    );
}
