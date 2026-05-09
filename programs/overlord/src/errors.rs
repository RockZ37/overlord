use anchor_lang::prelude::*;

#[error_code]
pub enum OverlordError {
    #[msg("Intent text exceeded the supported length.")]
    StringTooLong,
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Intent ID does not match the stored record.")]
    IntentMismatch,
}
