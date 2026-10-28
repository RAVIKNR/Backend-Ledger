ALTER TABLE "transfers"
    ADD COLUMN "failure_reason" VARCHAR(255),
    ADD COLUMN "available_balance_minor" BIGINT;
