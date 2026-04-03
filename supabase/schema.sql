-- =============================================
-- MASTERS POOL 2026 — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Golfers table
CREATE TABLE IF NOT EXISTS golfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  current_score INTEGER DEFAULT 0,
  made_cut BOOLEAN DEFAULT NULL,
  position TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entries (up to 3 per user)
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_number INTEGER NOT NULL DEFAULT 1,
  entry_name TEXT NOT NULL,
  golfer_1_id UUID REFERENCES golfers(id),
  golfer_2_id UUID REFERENCES golfers(id),
  golfer_3_id UUID REFERENCES golfers(id),
  golfer_4_id UUID REFERENCES golfers(id),
  total_points_used INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_number),
  CHECK (entry_number BETWEEN 1 AND 3)
);

-- =============================================
-- LEADERBOARD VIEW
-- Best 3 of 4 scores (drop worst)
-- =============================================
CREATE OR REPLACE VIEW entry_leaderboard AS
WITH base AS (
  SELECT
    e.id AS entry_id, e.entry_name, e.user_id, e.total_points_used,
    g1.name AS golfer_1, g1.current_score AS score_1, g1.made_cut AS cut_1,
    g2.name AS golfer_2, g2.current_score AS score_2, g2.made_cut AS cut_2,
    g3.name AS golfer_3, g3.current_score AS score_3, g3.made_cut AS cut_3,
    g4.name AS golfer_4, g4.current_score AS score_4, g4.made_cut AS cut_4
  FROM entries e
  LEFT JOIN golfers g1 ON e.golfer_1_id = g1.id
  LEFT JOIN golfers g2 ON e.golfer_2_id = g2.id
  LEFT JOIN golfers g3 ON e.golfer_3_id = g3.id
  LEFT JOIN golfers g4 ON e.golfer_4_id = g4.id
),
scored AS (
  SELECT *,
    (COALESCE(score_1,0)+COALESCE(score_2,0)+COALESCE(score_3,0)+COALESCE(score_4,0))
    - GREATEST(COALESCE(score_1,999),COALESCE(score_2,999),COALESCE(score_3,999),COALESCE(score_4,999))
    AS team_score,
    (COALESCE(cut_1::int,0)+COALESCE(cut_2::int,0)+COALESCE(cut_3::int,0)+COALESCE(cut_4::int,0)) AS made_cut_count
  FROM base
)
SELECT *,
  CASE WHEN made_cut_count < 3 AND (cut_1 IS NOT NULL OR cut_2 IS NOT NULL OR cut_3 IS NOT NULL OR cut_4 IS NOT NULL)
       THEN TRUE ELSE FALSE END AS is_disqualified,
  RANK() OVER (ORDER BY
    CASE WHEN made_cut_count < 3 AND (cut_1 IS NOT NULL) THEN 1 ELSE 0 END,
    team_score ASC
  ) AS place
FROM scored;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE golfers   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "entries_read"    ON entries  FOR SELECT USING (true);
CREATE POLICY "entries_insert"  ON entries  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "entries_update"  ON entries  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "entries_delete"  ON entries  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "golfers_read"    ON golfers  FOR SELECT USING (true);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
