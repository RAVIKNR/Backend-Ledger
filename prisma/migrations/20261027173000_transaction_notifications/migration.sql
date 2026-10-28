CREATE TABLE "transaction_notifications" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "recipient_email" VARCHAR(320) NOT NULL,
    "recipient_name" VARCHAR(120) NOT NULL,
    "notification_type" VARCHAR(16) NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reference" VARCHAR(255),
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(255),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transaction_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transaction_notifications_transfer_id_notification_type_key"
    ON "transaction_notifications"("transfer_id", "notification_type");
CREATE INDEX "transaction_notifications_status_created_at_idx"
    ON "transaction_notifications"("status", "created_at");
ALTER TABLE "transaction_notifications"
    ADD CONSTRAINT "transaction_notifications_transfer_id_fkey"
    FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction_notifications"
    ADD CONSTRAINT "transaction_notifications_recipient_user_id_fkey"
    FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
