CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "target_type" VARCHAR(40) NOT NULL,
    "target_id" VARCHAR(255) NOT NULL,
    "reason" VARCHAR(1000),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");
CREATE INDEX "admin_audit_logs_actor_id_created_at_idx" ON "admin_audit_logs"("actor_id", "created_at");
CREATE INDEX "admin_audit_logs_target_type_target_id_created_at_idx"
    ON "admin_audit_logs"("target_type", "target_id", "created_at");
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs"("action", "created_at");

ALTER TABLE "admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'admin_audit_logs are immutable';
END;
$$;

CREATE TRIGGER admin_audit_logs_immutable
BEFORE UPDATE OR DELETE ON "admin_audit_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_admin_audit_log_mutation();
