ALTER TABLE "transfers"
ADD CONSTRAINT "transfers_amount_minor_positive"
CHECK ("amount_minor" > 0);

ALTER TABLE "ledger_entries"
ADD CONSTRAINT "ledger_entries_amount_minor_positive"
CHECK ("amount_minor" > 0);

CREATE OR REPLACE FUNCTION validate_posted_transfer_ledger()
RETURNS trigger
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
  WHERE id = COALESCE(NEW.transfer_id, OLD.transfer_id);

  IF transfer_record.status <> 'COMPLETED' THEN
    RETURN NULL;
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

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_entries_posted_balance
AFTER INSERT OR UPDATE OR DELETE ON "ledger_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_posted_transfer_ledger();

CREATE CONSTRAINT TRIGGER transfers_posted_balance
AFTER INSERT OR UPDATE OF status ON "transfers"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED')
EXECUTE FUNCTION validate_posted_transfer_ledger();
