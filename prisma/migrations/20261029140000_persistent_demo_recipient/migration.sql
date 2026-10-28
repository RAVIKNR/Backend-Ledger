ALTER TABLE "accounts"
ADD COLUMN "account_number" VARCHAR(64);

UPDATE "accounts"
SET "account_number" = "id"::text
WHERE "account_number" IS NULL;

ALTER TABLE "accounts"
ALTER COLUMN "account_number" SET NOT NULL;

CREATE UNIQUE INDEX "accounts_account_number_key" ON "accounts"("account_number");

-- Keep one stable, active recipient for the demo environment. The password is
-- intentionally unusable for interactive authentication.
INSERT INTO "users" (
    "id", "email", "name", "password_hash", "status", "created_at", "updated_at"
)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'demo-recipient@ledgerguard.local',
    'LedgerGuard Demo Recipient',
    '$2b$12$4QmVwL5xQf1JzQf1W8w1Qe8sQ3J3gFqV8d4V2m1uM1W0o3z4Z1QeK',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "accounts" (
    "id", "account_number", "user_id", "currency", "status", "created_at", "updated_at"
)
VALUES (
    '00000000-0000-4000-8000-000000000002',
    'LG-DEMO-00000001',
    '00000000-0000-4000-8000-000000000001',
    'INR',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("account_number") DO UPDATE
SET "status" = 'ACTIVE';
