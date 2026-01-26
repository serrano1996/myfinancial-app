-- Function to update account balance
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
    v_account_id := NEW.account_id;
    v_amount := NEW.amount;
    
    -- Get category type
    SELECT type INTO v_category_type FROM categories WHERE id = NEW.category_id;
    
    IF v_category_type = 'income' THEN
      v_delta := v_amount;
    ELSE
      v_delta := -v_amount; -- Expense or Transfer
    END IF;

    UPDATE accounts SET balance = balance + v_delta WHERE id = v_account_id;
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    v_account_id := OLD.account_id;
    v_amount := OLD.amount;
    
    SELECT type INTO v_category_type FROM categories WHERE id = OLD.category_id;
    
    IF v_category_type = 'income' THEN
      v_delta := -v_amount; -- Reverse logic
    ELSE
      v_delta := v_amount;
    END IF;

    UPDATE accounts SET balance = balance + v_delta WHERE id = v_account_id;
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- First reverse OLD
    v_account_id := OLD.account_id;
    v_amount := OLD.amount;
    SELECT type INTO v_category_type FROM categories WHERE id = OLD.category_id;
    
    IF v_category_type = 'income' THEN
      v_delta := -v_amount;
    ELSE
      v_delta := v_amount;
    END IF;
    
    UPDATE accounts SET balance = balance + v_delta WHERE id = v_account_id;

    -- Then apply NEW
    v_account_id := NEW.account_id;
    v_amount := NEW.amount;
    SELECT type INTO v_category_type FROM categories WHERE id = NEW.category_id;
    
    IF v_category_type = 'income' THEN
      v_delta := v_amount;
    ELSE
      v_delta := -v_amount;
    END IF;
    
    UPDATE accounts SET balance = balance + v_delta WHERE id = v_account_id;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE public.update_account_balance();
