-- Migration 003: user_profiles, generated_outputs, credit_transactions
-- Run this in Supabase SQL editor after migration-002.sql

-- ============================================================
-- USER PROFILES
-- Extends auth.users with credit balance and plan tier
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text,
  full_name      text,
  organisation   text,
  credit_balance integer NOT NULL DEFAULT 3,  -- 3 free credits on signup
  plan           text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- RLS: users can only read/write their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can insert (used when creating profiles server-side)
CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- GENERATED OUTPUTS
-- Stores all AI-generated deliverables
-- ============================================================

CREATE TABLE IF NOT EXISTS generated_outputs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intelligence_item_id  uuid NOT NULL REFERENCES intelligence_items(id) ON DELETE CASCADE,
  output_type           text NOT NULL CHECK (output_type IN (
                          'delivery_brief',
                          'compliance_pack',
                          'governance_brief',
                          'board_summary',
                          'implementation_plan'
                        )),
  title                 text NOT NULL,
  content               jsonb NOT NULL,          -- structured output (type-specific JSON)
  source_item_title     text,
  source_item_url       text,
  source_name           text,
  credits_used          integer NOT NULL DEFAULT 1,
  created_at            timestamptz DEFAULT now()
);

-- Index for workspace listing (user's outputs, newest first)
CREATE INDEX IF NOT EXISTS idx_generated_outputs_user_created
  ON generated_outputs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_outputs_item
  ON generated_outputs (intelligence_item_id);

-- RLS: users see only their own outputs
ALTER TABLE generated_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outputs"
  ON generated_outputs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert outputs"
  ON generated_outputs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- CREDIT TRANSACTIONS
-- Full audit trail of all credit debits and credits
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      integer NOT NULL,    -- negative = debit, positive = credit
  reason      text NOT NULL CHECK (reason IN (
                'signup_bonus',
                'output_generated',
                'purchase',
                'admin_grant',
                'refund'
              )),
  output_id   uuid REFERENCES generated_outputs(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user
  ON credit_transactions (user_id, created_at DESC);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- HELPER FUNCTION: atomic credit deduction
-- Returns true if deduction succeeded, false if insufficient balance
-- ============================================================

CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id   uuid,
  p_amount    integer,
  p_reason    text,
  p_output_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance integer;
BEGIN
  -- Lock the row for update
  SELECT credit_balance INTO v_balance
  FROM user_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN false;
  END IF;

  UPDATE user_profiles
  SET credit_balance = credit_balance - p_amount,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, reason, output_id)
  VALUES (p_user_id, -p_amount, p_reason, p_output_id);

  RETURN true;
END;
$$;
