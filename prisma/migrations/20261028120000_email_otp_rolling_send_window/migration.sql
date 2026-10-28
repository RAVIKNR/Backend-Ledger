ALTER TABLE "email_otp_challenges"
ADD COLUMN "send_history" TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[];

UPDATE "email_otp_challenges"
SET "send_history" = array_fill("window_started_at", ARRAY["sends_in_window"])
WHERE "sends_in_window" > 0;
