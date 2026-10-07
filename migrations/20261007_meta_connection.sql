-- Apply before deploying the Meta connection. No credentials belong in SQL files.
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS encrypted_token text;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_campaign_id text;
