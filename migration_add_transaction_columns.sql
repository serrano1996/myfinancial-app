-- Migration: Add missing columns to transactions table
-- Created: 2026-02-02
-- Purpose: Fix transaction save issue by adding type, notes, and deleted_at columns

-- Step 1: Add the missing columns
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS type category_type,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Drop old policies that need updating
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can soft delete their own transactions" ON transactions;

-- Step 3: Create updated policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can soft delete their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (deleted_at IS NOT NULL);

-- Note: The hard delete policy remains unchanged
-- CREATE POLICY "Users can delete their own transactions" ON transactions
--   FOR DELETE USING (auth.uid() = user_id);

-- Step 4: Optional - Set default values for existing records
-- Uncomment the following line if you want to set a default type for existing transactions
-- UPDATE transactions SET type = 'expense' WHERE type IS NULL;

-- Migration complete!
-- Your transactions should now save correctly with type, notes, and soft delete support.
