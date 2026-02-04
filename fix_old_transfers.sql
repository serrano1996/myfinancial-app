-- Migration script to fix old transfer transactions
-- This script corrects transfers that have both transactions with positive amounts
-- After this fix, the outgoing transaction will have negative amount

-- Step 1: Identify transfers that need fixing
-- Transfers are linked by same amount, date, description, and type='transfer'

-- Step 2: Update outgoing transfers to have negative amounts
-- We'll identify the "outgoing" as the one that should deduct money from an account
-- For simplicity, we'll make one of each pair negative if both are currently positive

WITH transfer_pairs AS (
  SELECT 
    t1.id as id1,
    t2.id as id2,
    t1.amount,
    t1.date,
    t1.description,
    t1.account_id as account1,
    t2.account_id as account2
  FROM transactions t1
  JOIN transactions t2 
    ON t1.type = 'transfer' 
    AND t2.type = 'transfer'
    AND t1.amount = t2.amount 
    AND t1.amount > 0  -- Both are positive
    AND t1.date = t2.date
    AND t1.description = t2.description
    AND t1.account_id != t2.account_id
    AND t1.id < t2.id  -- Avoid duplicates
)
UPDATE transactions
SET amount = -amount
WHERE id IN (
  SELECT id1 FROM transfer_pairs
);

-- Verification: Check if there are any remaining transfer pairs with both positive amounts
SELECT 
  t1.id,
  t1.amount as amount1,
  t1.account_id as account1,
  t2.id,
  t2.amount as amount2,
  t2.account_id as account2,
  t1.description,
  t1.date
FROM transactions t1
JOIN transactions t2 
  ON t1.type = 'transfer' 
  AND t2.type = 'transfer'
  AND ABS(t1.amount) = ABS(t2.amount)
  AND t1.date = t2.date
  AND t1.description = t2.description
  AND t1.account_id != t2.account_id
  AND t1.id < t2.id
ORDER BY t1.date DESC;
