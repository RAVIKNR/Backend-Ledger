ALTER TABLE "users"
ADD COLUMN "phone_verified_at" TIMESTAMP(3);

CREATE TABLE "phone_otp_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'SENDING',
    "window_started_at" TIMESTAMP(3) NOT NULL,
    "sends_in_window" INTEGER NOT NULL DEFAULT 1,
    "sent_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resend_after_at" TIMESTAMP(3) NOT NULL,
    "verification_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_otp_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "phone_otp_challenges_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "phone_otp_challenges_user_id_key"
ON "phone_otp_challenges"("user_id");

CREATE INDEX "phone_otp_challenges_status_expires_at_idx"
ON "phone_otp_challenges"("status", "expires_at");

CREATE INDEX "phone_otp_challenges_phone_window_started_at_idx"
ON "phone_otp_challenges"("phone", "window_started_at");
