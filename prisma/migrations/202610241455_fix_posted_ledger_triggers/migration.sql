-- Replace the shared trigger function with table-specific functions.
-- Ledger-entry triggers resolve transfers through transfer_id.
-- Transfer triggers resolve transfers through the transfer row id.

DROP TRIGGER IF EXISTS ledger_entries_posted_balance ON "ledger_entries";
DROP TRIGGER IF EXISTS transfers_posted_balance ON "transfers";
DROP FUNCTION IF EXISTS validate_posted_transfer_ledger();

CREATE OR REPLACE FUNCTION validate_transfer_ledger(p_transfer_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  transfer_record RECORD;
  entry_count INTEGER;
  debit_total BIGINT;
  credit_total BIGINT;
BEGIN
  SELECT id, sender_account_id, receiver_account_id, amount_minor, status
  INTO transfer_record
  FROM "transfers"
  WHERE id = p_transfer_id;

  IF NOT FOUND OR transfer_record.status <> 'COMPLETED' THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(amount_minor) FILTER (WHERE entry_type = 'DEBIT'), 0),
    COALESCE(SUM(amount_minor) FILTER (WHERE entry_type = 'CREDIT'), 0)
  INTO entry_count, debit_total, credit_total
  FROM "ledger_entries"
  WHERE transfer_id = transfer_record.id;

  IF transfer_record.sender_account_id IS NULL THEN
    IF entry_count <> 1
       OR debit_total <> 0
       OR credit_total <> transfer_record.amount_minor THEN
      RAISE EXCEPTION 'Funding transfer % must have one matching credit entry', transfer_record.id;
    END IF;
  ELSIF entry_count <> 2
        OR debit_total <> transfer_record.amount_minor
        OR credit_total <> transfer_record.amount_minor THEN
    RAISE EXCEPTION 'Transfer % must have balanced debit and credit entries', transfer_record.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION validate_posted_transfer_from_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM validate_transfer_ledger(NEW.transfer_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM validate_transfer_ledger(OLD.transfer_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM validate_transfer_ledger(OLD.transfer_id);

    IF NEW.transfer_id IS DISTINCT FROM OLD.transfer_id THEN
      PERFORM validate_transfer_ledger(NEW.transfer_id);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION validate_posted_transfer_from_transfer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status = 'COMPLETED' THEN
      PERFORM validate_transfer_ledger(NEW.id);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_entries_posted_balance
AFTER INSERT OR UPDATE OR DELETE ON "ledger_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_posted_transfer_from_ledger_entry();

CREATE CONSTRAINT TRIGGER transfers_posted_balance
AFTER INSERT OR UPDATE OF status ON "transfers"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED')
EXECUTE FUNCTION validate_posted_transfer_from_transfer();
