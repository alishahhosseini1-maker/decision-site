-- Migration: Create decision_payments table for Stripe payment tracking
-- Run this in Supabase SQL Editor

-- First, if the table already exists, alter it to add the email column
-- If you haven't run the migration yet, skip the ALTER and just use the CREATE below

-- ALTER TABLE decision_payments
--   ADD COLUMN IF NOT EXISTS customer_email TEXT,
--   ALTER COLUMN user_id DROP NOT NULL;

-- Fresh migration (use this if table doesn't exist yet):
DROP TABLE IF EXISTS decision_payments CASCADE;

CREATE TABLE decision_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  stripe_session_id TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decision_payments_decision_user ON decision_payments(decision_id, user_id);
CREATE INDEX idx_decision_payments_email ON decision_payments(customer_email);
CREATE INDEX idx_decision_payments_session ON decision_payments(stripe_session_id);

-- Grant access to authenticated users
ALTER TABLE decision_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON decision_payments FOR SELECT
  USING (auth.uid() = user_id OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
