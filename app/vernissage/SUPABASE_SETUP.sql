-- =============================================================
-- Liberty Art — Vernissage Paris 2026
-- À exécuter dans le SQL Editor du projet Supabase edrbriqwisojtgbueklq
-- =============================================================

CREATE TABLE IF NOT EXISTS vernissage_inscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  email TEXT NOT NULL UNIQUE,
  invitation_envoyee BOOLEAN DEFAULT false,
  date_envoi TIMESTAMPTZ,
  brevo_message_id TEXT,
  user_agent TEXT,
  ip_address TEXT
);

ALTER TABLE vernissage_inscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert" ON vernissage_inscriptions;
CREATE POLICY "Allow public insert" ON vernissage_inscriptions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select for dedup" ON vernissage_inscriptions;
CREATE POLICY "Allow public select for dedup" ON vernissage_inscriptions
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_vernissage_email ON vernissage_inscriptions(email);
CREATE INDEX IF NOT EXISTS idx_vernissage_created_at ON vernissage_inscriptions(created_at DESC);
