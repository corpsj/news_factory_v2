ALTER TABLE clients ADD COLUMN IF NOT EXISTS api_key_prefix text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS api_key_last4 text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS request_count bigint NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clients_api_key_prefix ON clients(api_key_prefix) WHERE api_key_prefix IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at) WHERE deleted_at IS NULL;
