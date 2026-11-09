use soroban_sdk::{contracterror, contracttype, Address, String, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    AlreadyInitialized = 1,
    AgreementAlreadyExists = 2,
    AgreementNotFound = 3,
    InvalidStatus = 4,
    Unauthorized = 5,
    InvalidAmount = 6,
    MilestoneNotFound = 7,
    MilestoneInvalidStatus = 8,
    InsufficientBalance = 9,
    DisputeNotActive = 10,
    ArithmeticOverflow = 11,
    ZeroMilestones = 12,
    DuplicateMilestoneId = 13,
    AmountMismatch = 14,
    AlreadyPaid = 15,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AgreementStatus {
    PendingFunding = 0,
    Funded = 1,
    Completed = 2,
    Disputed = 3,
    Cancelled = 4,
    Refunded = 5,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum MilestoneStatus {
    Pending = 0,
    Submitted = 1,
    RevisionRequested = 2,
    Approved = 3,
    Paid = 4,
    Disputed = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneInput {
    pub id: u32,
    pub amount: i128,
    pub description: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub id: u32,
    pub amount: i128,
    pub description: String,
    pub status: MilestoneStatus,
    pub submission_ref: String,
    pub approved_at: u64,
    pub paid_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowAgreement {
    pub agreement_id: u64,
    pub client: Address,
    pub freelancer: Address,
    pub arbiter: Address,
    pub token: Address,
    pub total_amount: i128,
    pub funded_amount: i128,
    pub released_amount: i128,
    pub refunded_amount: i128,
    pub status: AgreementStatus,
    pub milestones: Vec<Milestone>,
    pub created_at: u64,
    pub title: String,
}

#[contracttype]
pub enum DataKey {
    Agreement(u64),
    AgreementCount,
    Admin,
}
