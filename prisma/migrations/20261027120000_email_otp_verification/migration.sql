ALTER TABLE "users"
RENAME COLUMN "phone_verified_at" TO "legacy_phone_verified_at";

ALTER TABLE "phone_otp_challenges"
RENAME TO "legacy_phone_otp_challenges";

ALTER TABLE "legacy_phone_otp_challenges"
RENAME CONSTRAINT "phone_otp_challenges_pkey" TO "legacy_phone_otp_challenges_pkey";

ALTER TABLE "legacy_phone_otp_challenges"
RENAME CONSTRAINT "phone_otp_challenges_user_id_fkey" TO "legacy_phone_otp_challenges_user_id_fkey";

ALTER INDEX "phone_otp_challenges_user_id_key"
RENAME TO "legacy_phone_otp_challenges_user_id_key";

ALTER INDEX "phone_otp_challenges_status_expires_at_idx"
RENAME TO "legacy_phone_otp_challenges_status_expires_at_idx";

ALTER INDEX "phone_otp_challenges_phone_window_started_at_idx"
RENAME TO "legacy_phone_otp_challenges_phone_window_started_at_idx";

CREATE TABLE "email_otp_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "otp_hash" VARCHAR(64),
    "status" VARCHAR(24) NOT NULL DEFAULT 'SENDING',
    "window_started_at" TIMESTAMP(3) NOT NULL,
    "sends_in_window" INTEGER NOT NULL DEFAULT 1,
    "sent_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resend_after_at" TIMESTAMP(3) NOT NULL,
    "verification_attempts" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_otp_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_otp_challenges_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "email_otp_challenges_user_id_key"
ON "email_otp_challenges"("user_id");

CREATE INDEX "email_otp_challenges_status_expires_at_idx"
ON "email_otp_challenges"("status", "expires_at");

CREATE INDEX "email_otp_challenges_email_window_started_at_idx"
ON "email_otp_challenges"("email", "window_started_at");
