#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::Client as TokenClient,
    token::StellarAssetClient,
    Address, Env, String, Vec,
};

fn create_token<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, StellarAssetClient<'a>, Address) {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    (
        TokenClient::new(env, &token_address),
        StellarAssetClient::new(env, &token_address),
        token_address,
    )
}

fn setup_test<'a>(
    env: &'a Env,
) -> (
    PactPayEscrowClient<'a>,
    Address,
    Address,
    Address,
    Address,
    TokenClient<'a>,
    StellarAssetClient<'a>,
) {
    let contract_id = env.register(PactPayEscrow, ());
    let client = PactPayEscrowClient::new(env, &contract_id);

    let client_addr = Address::generate(env);
    let freelancer_addr = Address::generate(env);
    let arbiter_addr = Address::generate(env);
    let token_admin = Address::generate(env);

    let (token_client, token_admin_client, token_addr) = create_token(env, &token_admin);

    // Mint tokens to client
    token_admin_client.mint(&client_addr, &10_000);

    (
        client,
        client_addr,
        freelancer_addr,
        arbiter_addr,
        token_addr,
        token_client,
        token_admin_client,
    )
}

#[test]
fn test_full_escrow_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract, client_addr, freelancer_addr, arbiter_addr, token_addr, token_client, _) =
        setup_test(&env);

    let agreement_id: u64 = 101;
    let mut milestones = Vec::new(&env);
    milestones.push_back(MilestoneInput {
        id: 1,
        amount: 600,
        description: String::from_str(&env, "Design Wireframes"),
    });
    milestones.push_back(MilestoneInput {
        id: 2,
        amount: 400,
        description: String::from_str(&env, "Full Stack Implementation"),
    });

    let agreement = contract.create_agreement(
        &agreement_id,
        &client_addr,
        &freelancer_addr,
        &arbiter_addr,
        &token_addr,
        &1000,
        &milestones,
        &String::from_str(&env, "PactPay Web App"),
    );

    assert_eq!(agreement.status, AgreementStatus::PendingFunding);
    assert_eq!(agreement.funded_amount, 0);
    assert_eq!(agreement.total_amount, 1000);
    assert_eq!(agreement.milestones.len(), 2);

    // 1. Client funds agreement
    let funded = contract.fund_agreement(&agreement_id, &client_addr);
    assert_eq!(funded.status, AgreementStatus::Funded);
    assert_eq!(funded.funded_amount, 1000);
    assert_eq!(token_client.balance(&contract.address), 1000);
    assert_eq!(token_client.balance(&client_addr), 9000);

    // 2. Freelancer submits milestone 1
    let sub_ref_1 = String::from_str(&env, "https://github.com/pactpay/design/pull/1");
    let after_sub = contract.submit_milestone(&agreement_id, &1, &freelancer_addr, &sub_ref_1);
    assert_eq!(after_sub.milestones.get(0).unwrap().status, MilestoneStatus::Submitted);

    // 3. Client requests revision on milestone 1
    let note = String::from_str(&env, "Please adjust the color scheme to dark emerald");
    let after_rev = contract.request_revision(&agreement_id, &1, &client_addr, &note);
    assert_eq!(
        after_rev.milestones.get(0).unwrap().status,
        MilestoneStatus::RevisionRequested
    );

    // 4. Freelancer resubmits milestone 1
    let sub_ref_1_v2 = String::from_str(&env, "https://github.com/pactpay/design/pull/2");
    let after_resub = contract.submit_milestone(&agreement_id, &1, &freelancer_addr, &sub_ref_1_v2);
    assert_eq!(after_resub.milestones.get(0).unwrap().status, MilestoneStatus::Submitted);

    // 5. Client approves milestone 1 -> releases 600 tokens
    let after_pay_1 = contract.approve_and_release(&agreement_id, &1, &client_addr);
    assert_eq!(after_pay_1.milestones.get(0).unwrap().status, MilestoneStatus::Paid);
    assert_eq!(after_pay_1.released_amount, 600);
    assert_eq!(token_client.balance(&freelancer_addr), 600);
    assert_eq!(token_client.balance(&contract.address), 400);
    assert_eq!(contract.get_remaining_balance(&agreement_id), 400);

    // 6. Freelancer submits milestone 2
    let sub_ref_2 = String::from_str(&env, "https://github.com/pactpay/app/releases/tag/v1.0.0");
    contract.submit_milestone(&agreement_id, &2, &freelancer_addr, &sub_ref_2);

    // 7. Client approves milestone 2 -> releases 400 tokens -> Agreement Completed
    let final_agreement = contract.approve_and_release(&agreement_id, &2, &client_addr);
    assert_eq!(final_agreement.status, AgreementStatus::Completed);
    assert_eq!(final_agreement.released_amount, 1000);
    assert_eq!(token_client.balance(&freelancer_addr), 1000);
    assert_eq!(token_client.balance(&contract.address), 0);
    assert_eq!(contract.get_remaining_balance(&agreement_id), 0);
}

#[test]
fn test_unfunded_cancellation() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract, client_addr, freelancer_addr, arbiter_addr, token_addr, _, _) =
        setup_test(&env);

    let agreement_id: u64 = 102;
    let mut milestones = Vec::new(&env);
    milestones.push_back(MilestoneInput {
        id: 1,
        amount: 500,
        description: String::from_str(&env, "Task 1"),
    });

    contract.create_agreement(
        &agreement_id,
        &client_addr,
        &freelancer_addr,
        &arbiter_addr,
        &token_addr,
        &500,
        &milestones,
        &String::from_str(&env, "Cancelled Project"),
    );

    let cancelled = contract.cancel_agreement(&agreement_id, &client_addr);
    assert_eq!(cancelled.status, AgreementStatus::Cancelled);

    // Trying to fund cancelled agreement fails
    let res = contract.try_fund_agreement(&agreement_id, &client_addr);
    assert_eq!(res, Err(Ok(EscrowError::InvalidStatus)));
}

#[test]
fn test_mutual_refund() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract, client_addr, freelancer_addr, arbiter_addr, token_addr, token_client, _) =
        setup_test(&env);

    let agreement_id: u64 = 103;
    let mut milestones = Vec::new(&env);
    milestones.push_back(MilestoneInput {
        id: 1,
        amount: 800,
        description: String::from_str(&env, "Phase 1"),
    });

    contract.create_agreement(
        &agreement_id,
        &client_addr,
        &freelancer_addr,
        &arbiter_addr,
        &token_addr,
        &800,
        &milestones,
        &String::from_str(&env, "Refunded Project"),
    );

    contract.fund_agreement(&agreement_id, &client_addr);
    assert_eq!(token_client.balance(&client_addr), 9200);

    // Mutual refund
    let refunded = contract.refund_agreement(&agreement_id, &client_addr, &freelancer_addr);
    assert_eq!(refunded.status, AgreementStatus::Refunded);
    assert_eq!(refunded.refunded_amount, 800);
    assert_eq!(token_client.balance(&client_addr), 10_000);
    assert_eq!(token_client.balance(&contract.address), 0);
}

#[test]
fn test_dispute_and_resolution() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract, client_addr, freelancer_addr, arbiter_addr, token_addr, token_client, _) =
        setup_test(&env);

    let agreement_id: u64 = 104;
    let mut milestones = Vec::new(&env);
    milestones.push_back(MilestoneInput {
        id: 1,
        amount: 500,
        description: String::from_str(&env, "Part 1"),
    });
    milestones.push_back(MilestoneInput {
        id: 2,
        amount: 500,
        description: String::from_str(&env, "Part 2"),
    });

    contract.create_agreement(
        &agreement_id,
        &client_addr,
        &freelancer_addr,
        &arbiter_addr,
        &token_addr,
        &1000,
        &milestones,
        &String::from_str(&env, "Disputed Project"),
    );

    contract.fund_agreement(&agreement_id, &client_addr);

    // Freelancer submits milestone 1, client approves
    contract.submit_milestone(&agreement_id, &1, &freelancer_addr, &String::from_str(&env, "url"));
    contract.approve_and_release(&agreement_id, &1, &client_addr);
    assert_eq!(token_client.balance(&freelancer_addr), 500);

    // For milestone 2, conflict occurs. Freelancer opens dispute.
    let disputed = contract.open_dispute(
        &agreement_id,
        &freelancer_addr,
        &String::from_str(&env, "Client requested out-of-scope work without agreement"),
    );
    assert_eq!(disputed.status, AgreementStatus::Disputed);

    // Cannot approve while in dispute
    let approve_res = contract.try_approve_and_release(&agreement_id, &2, &client_addr);
    assert_eq!(approve_res, Err(Ok(EscrowError::InvalidStatus)));

    // Arbiter resolves dispute: splits remaining 500 balance (200 to freelancer, 300 to client)
    let resolved = contract.resolve_dispute(&agreement_id, &arbiter_addr, &300, &200);
    assert_eq!(resolved.status, AgreementStatus::Completed);
    assert_eq!(token_client.balance(&freelancer_addr), 700); // 500 + 200
    assert_eq!(token_client.balance(&client_addr), 9300); // 10000 - 1000 + 300
    assert_eq!(token_client.balance(&contract.address), 0);
}

#[test]
fn test_security_validations() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract, client_addr, freelancer_addr, arbiter_addr, token_addr, _, _) =
        setup_test(&env);

    let agreement_id: u64 = 105;
    let mut milestones = Vec::new(&env);
    milestones.push_back(MilestoneInput {
        id: 1,
        amount: 500,
        description: String::from_str(&env, "Milestone 1"),
    });

    // 1. Amount mismatch test
    let res = contract.try_create_agreement(
        &agreement_id,
        &client_addr,
        &freelancer_addr,
        &arbiter_addr,
        &token_addr,
        &1000, // mismatch: total 1000 != milestone sum 500
        &milestones,
        &String::from_str(&env, "Bad Amounts"),
    );
    assert_eq!(res, Err(Ok(EscrowError::AmountMismatch)));

    // 2. Zero amount test
    let zero_res = contract.try_create_agreement(
        &agreement_id,
        &client_addr,
        &freelancer_addr,
        &arbiter_addr,
        &token_addr,
        &0,
        &milestones,
        &String::from_str(&env, "Zero Amount"),
    );
    assert_eq!(zero_res, Err(Ok(EscrowError::InvalidAmount)));

    // 3. Duplicate milestone IDs
    let mut dup_milestones = Vec::new(&env);
    dup_milestones.push_back(MilestoneInput {
        id: 1,
        amount: 250,
        description: String::from_str(&env, "Part A"),
    });
    dup_milestones.push_back(MilestoneInput {
        id: 1, // duplicate id!
        amount: 250,
        description: String::from_str(&env, "Part B"),
    });
    let dup_res = contract.try_create_agreement(
        &agreement_id,
        &client_addr,
        &freelancer_addr,
        &arbiter_addr,
        &token_addr,
        &500,
        &dup_milestones,
        &String::from_str(&env, "Dup Milestones"),
    );
    assert_eq!(dup_res, Err(Ok(EscrowError::DuplicateMilestoneId)));
}
