-- Add idempotency key to decisions table to prevent duplicate rows.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS request_key uuid UNIQUE;
