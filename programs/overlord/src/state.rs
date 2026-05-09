use anchor_lang::prelude::*;

#[account]
pub struct IntentRecord {
    pub authority: Pubkey,
    pub intent_id: u64,
    pub source_chain: String,
    pub source_asset: String,
    pub destination_chain: String,
    pub destination_asset: String,
    pub destination_action: String,
    pub amount: u64,
    pub route_ref: String,
    pub execution_ref: String,
    pub status: IntentStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl IntentRecord {
    pub const MAX_CHAIN_LEN: usize = 16;
    pub const MAX_ASSET_LEN: usize = 16;
    pub const MAX_ACTION_LEN: usize = 32;
    pub const MAX_ROUTE_REF_LEN: usize = 96;
    pub const MAX_EXECUTION_REF_LEN: usize = 128;

    pub const SPACE: usize = 32
        + 8
        + (4 + Self::MAX_CHAIN_LEN)
        + (4 + Self::MAX_ASSET_LEN)
        + (4 + Self::MAX_CHAIN_LEN)
        + (4 + Self::MAX_ASSET_LEN)
        + (4 + Self::MAX_ACTION_LEN)
        + 8
        + (4 + Self::MAX_ROUTE_REF_LEN)
        + (4 + Self::MAX_EXECUTION_REF_LEN)
        + 1
        + 8
        + 8
        + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum IntentStatus {
    Created,
    Routed,
    Executing,
    Completed,
    Failed,
}
