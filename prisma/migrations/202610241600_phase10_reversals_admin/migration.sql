CREATE TABLE "reversals" (
    "id" UUID NOT NULL,
    "original_transfer_id" UUID NOT NULL,
    "reversal_transfer_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reversals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_decisions" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "decision" VARCHAR(32) NOT NULL,
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_decisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reversals_original_transfer_id_key" ON "reversals"("original_transfer_id");
CREATE UNIQUE INDEX "reversals_reversal_transfer_id_key" ON "reversals"("reversal_transfer_id");
CREATE UNIQUE INDEX "reversals_requested_by_user_id_idempotency_key_key"
    ON "reversals"("requested_by_user_id", "idempotency_key");
CREATE INDEX "reversals_created_at_idx" ON "reversals"("created_at");
CREATE INDEX "admin_decisions_transfer_id_created_at_idx"
    ON "admin_decisions"("transfer_id", "created_at");
CREATE INDEX "admin_decisions_decision_created_at_idx"
    ON "admin_decisions"("decision", "created_at");

ALTER TABLE "reversals"
    ADD CONSTRAINT "reversals_original_transfer_id_fkey"
    FOREIGN KEY ("original_transfer_id") REFERENCES "transfers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reversals"
    ADD CONSTRAINT "reversals_reversal_transfer_id_fkey"
    FOREIGN KEY ("reversal_transfer_id") REFERENCES "transfers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reversals"
    ADD CONSTRAINT "reversals_requested_by_user_id_fkey"
    FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_decisions"
    ADD CONSTRAINT "admin_decisions_transfer_id_fkey"
    FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_decisions"
    ADD CONSTRAINT "admin_decisions_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
