-- 1. Restore the fixed Trigger (Logic was correct in previous attempt)
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_category_type category_type;
  v_amount DECIMAL;
  v_account_id UUID;
  v_delta DECIMAL;
BEGIN
  -- Determine operation type and values
  IF (TG_OP = 'INSERT') THEN
    IF NEW.deleted_at IS NULL THEN
      v_account_id := NEW.account_id;
      v_amount := NEW.amount;
      
      SELECT type INTO v_category_type FROM categories WHERE id = NEW.category_id;
      
      IF v_category_type = 'income' THEN
        v_delta := v_amount;
      ELSE
        v_delta := -v_amount;
      END IF;

      UPDATE accounts SET balance = balance + v_delta WHERE id = v_account_id;
    END IF;
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.deleted_at IS NULL THEN
      v_account_id := OLD.account_id;
      v_amount := OLD.amount;
      
      SELECT type INTO v_category_type FROM categories WHERE id = OLD.category_id;
      
      IF v_category_type = 'income' THEN
        v_delta := -v_amount;
      ELSE
        v_delta := v_amount;
      END IF;

      UPDATE accounts SET balance = balance + v_delta WHERE id = v_account_id;
    END IF;
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- First: Reverse effect of OLD record if it was active
    IF OLD.deleted_at IS NULL THEN
      v_account_id := OLD.account_id;
      v_amount := OLD.amount;
      SELECT type INTO v_category_type FROM categories WHERE id = OLD.category_id;
      
      IF v_category_type = 'income' THEN
        v_delta := -v_amount;
      ELSE
        v_delta := v_amount;
      END IF;
      
      UPDATE accounts SET balance = balance + v_delta WHERE id = v_account_id;
    END IF;

    -- Second: Apply effect of NEW record if it is active
    IF NEW.deleted_at IS NULL THEN
      v_account_id := NEW.account_id;
      v_amount := NEW.amount;
      SELECT type INTO v_category_type FROM categories WHERE id = NEW.category_id;
      
      IF v_category_type = 'income' THEN
        v_delta := v_amount;
      ELSE
        v_delta := -v_amount;
      END IF;
      
      UPDATE accounts SET balance = balance + v_delta WHERE id = v_account_id;
    END IF;

    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_transaction_change ON transactions;
CREATE TRIGGER on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE public.update_account_balance();

-- 2. Permanently Set Permissive SELECT Policy
-- Allows users to see their own deleted transactions.
-- The Frontend app filters `deleted_at IS NULL` by default, so this is safe and enables the DELETE response.
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure Update Policy is correct (Already done, but safe to repeat)
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);
