-- =============================================================
-- Liberty Art — Vernissage Paris 2026
-- À exécuter dans le SQL Editor du projet Supabase edrbriqwisojtgbueklq
-- =============================================================

CREATE TABLE IF NOT EXISTS vernissage_inscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  invitation_envoyee BOOLEAN DEFAULT false NOT NULL,
  token_invitation UUID DEFAULT gen_random_uuid() NOT NULL,
  nb_invites INT DEFAULT 2 NOT NULL
);

ALTER TABLE vernissage_inscriptions
  ADD COLUMN IF NOT EXISTS token_invitation UUID DEFAULT gen_random_uuid() NOT NULL,
  ADD COLUMN IF NOT EXISTS nb_invites INT DEFAULT 2 NOT NULL;

ALTER TABLE vernissage_inscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert" ON vernissage_inscriptions;
CREATE POLICY "Allow public insert" ON vernissage_inscriptions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select for dedup" ON vernissage_inscriptions;
CREATE POLICY "Allow public select for dedup" ON vernissage_inscriptions
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_vernissage_email ON vernissage_inscriptions(email);
CREATE INDEX IF NOT EXISTS idx_vernissage_created_at ON vernissage_inscriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vernissage_token ON vernissage_inscriptions(token_invitation);
