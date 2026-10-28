CREATE TABLE "security_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID,
    "event_type" VARCHAR(32) NOT NULL,
    "previous_status" VARCHAR(16) NOT NULL,
    "resulting_status" VARCHAR(16) NOT NULL,
    "reason" VARCHAR(255),
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(255),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_notifications_status_created_at_idx"
    ON "security_notifications"("status", "created_at");
CREATE INDEX "security_notifications_user_id_created_at_idx"
    ON "security_notifications"("user_id", "created_at");
ALTER TABLE "security_notifications"
    ADD CONSTRAINT "security_notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_notifications"
    ADD CONSTRAINT "security_notifications_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
