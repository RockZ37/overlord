use anchor_lang::prelude::*;

use crate::errors::OverlordError;
use crate::state::{IntentRecord, IntentStatus};

pub mod errors;
pub mod state;

declare_id!("AoC6gRnhkN8TpueJoNpwXA9i47zYg5QpUu3voTL9284R");

#[program]
pub mod overlord {
    use super::*;

    pub fn register_intent(ctx: Context<RegisterIntent>, params: IntentParams) -> Result<()> {
        validate_intent_params(&params)?;

        let now = Clock::get()?.unix_timestamp;
        let record = &mut ctx.accounts.intent_record;
        record.authority = ctx.accounts.authority.key();
        record.intent_id = params.intent_id;
        record.source_chain = params.source_chain;
        record.source_asset = params.source_asset;
        record.destination_chain = params.destination_chain;
        record.destination_asset = params.destination_asset;
        record.destination_action = params.destination_action;
        record.amount = params.amount;
        record.route_ref = String::new();
        record.execution_ref = String::new();
        record.status = IntentStatus::Created;
        record.created_at = now;
        record.updated_at = now;
        record.bump = ctx.bumps.intent_record;

        Ok(())
    }

    pub fn attach_route_reference(
        ctx: Context<UpdateIntentRecord>,
        intent_id: u64,
        route_ref: String,
    ) -> Result<()> {
        validate_text(&route_ref, IntentRecord::MAX_ROUTE_REF_LEN)?;

        let record = &mut ctx.accounts.intent_record;
        record.route_ref = route_ref;
        record.status = IntentStatus::Routed;
        record.updated_at = Clock::get()?.unix_timestamp;

        require!(record.intent_id == intent_id, OverlordError::IntentMismatch);

        Ok(())
    }

    pub fn record_execution_reference(
        ctx: Context<UpdateIntentRecord>,
        intent_id: u64,
        execution_ref: String,
    ) -> Result<()> {
        validate_text(&execution_ref, IntentRecord::MAX_EXECUTION_REF_LEN)?;

        let record = &mut ctx.accounts.intent_record;
        record.execution_ref = execution_ref;
        record.status = IntentStatus::Executing;
        record.updated_at = Clock::get()?.unix_timestamp;

        require!(record.intent_id == intent_id, OverlordError::IntentMismatch);

        Ok(())
    }

    pub fn update_status(
        ctx: Context<UpdateIntentRecord>,
        intent_id: u64,
        status: IntentStatus,
    ) -> Result<()> {
        let record = &mut ctx.accounts.intent_record;
        record.status = status;
        record.updated_at = Clock::get()?.unix_timestamp;

        require!(record.intent_id == intent_id, OverlordError::IntentMismatch);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(params: IntentParams)]
pub struct RegisterIntent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + IntentRecord::SPACE,
        seeds = [b"intent", authority.key().as_ref(), &params.intent_id.to_le_bytes()],
        bump
    )]
    pub intent_record: Account<'info, IntentRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(intent_id: u64)]
pub struct UpdateIntentRecord<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority,
        seeds = [b"intent", authority.key().as_ref(), &intent_id.to_le_bytes()],
        bump = intent_record.bump
    )]
    pub intent_record: Account<'info, IntentRecord>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IntentParams {
    pub intent_id: u64,
    pub source_chain: String,
    pub source_asset: String,
    pub destination_chain: String,
    pub destination_asset: String,
    pub destination_action: String,
    pub amount: u64,
}

fn validate_intent_params(params: &IntentParams) -> Result<()> {
    require!(params.amount > 0, OverlordError::InvalidAmount);
    validate_text(&params.source_chain, IntentRecord::MAX_CHAIN_LEN)?;
    validate_text(&params.source_asset, IntentRecord::MAX_ASSET_LEN)?;
    validate_text(&params.destination_chain, IntentRecord::MAX_CHAIN_LEN)?;
    validate_text(&params.destination_asset, IntentRecord::MAX_ASSET_LEN)?;
    validate_text(&params.destination_action, IntentRecord::MAX_ACTION_LEN)?;
    Ok(())
}

fn validate_text(value: &str, max_len: usize) -> Result<()> {
    require!(value.len() <= max_len, OverlordError::StringTooLong);
    Ok(())
}
