-- =======================================================
-- ARIS VOSS AUTONOMOUS AI RESEARCHER - SUPABASE SCHEMA
-- =======================================================
-- Run this SQL in your Supabase Project -> SQL Editor -> New Query -> Run

-- 1. Create Posts Table with State Machine (DRAFT -> QUEUED -> PUBLISHED)
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED', -- 'DRAFT', 'QUEUED', 'PUBLISHED'
  text TEXT NOT NULL,
  rationale TEXT,
  why_topic_selected TEXT,
  why_relevant_now TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  topic_tags JSONB DEFAULT '[]'::jsonb,
  editorial_score NUMERIC DEFAULT 85,
  mermaid_diagram TEXT,
  image_url TEXT,
  metrics_cited JSONB DEFAULT '[]'::jsonb,
  published_to_linkedin BOOLEAN DEFAULT false,
  linkedin_published_at TIMESTAMPTZ,
  webhook_response TEXT
);

-- Migration support for existing table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published_to_linkedin BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS linkedin_published_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS webhook_response TEXT;

-- 2. Create Rejection Logs Table (Editorial Audit Trail)
CREATE TABLE IF NOT EXISTS public.rejected_topics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  agent_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_url TEXT
);

-- 3. Create Content Backlog Table (Dynamic Arbitration Queue)
CREATE TABLE IF NOT EXISTS public.backlog (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT,
  score NUMERIC NOT NULL,
  breakdown JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  source_name TEXT,
  readme_snippet TEXT
);

-- 4. Enable Row Level Security (RLS) and allow Read access
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejected_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for Make.com and frontend)
CREATE POLICY "Allow public read posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow service role full access posts" ON public.posts FOR ALL USING (true);

CREATE POLICY "Allow public read rejected_topics" ON public.rejected_topics FOR SELECT USING (true);
CREATE POLICY "Allow service role full access rejected_topics" ON public.rejected_topics FOR ALL USING (true);

CREATE POLICY "Allow public read backlog" ON public.backlog FOR SELECT USING (true);
CREATE POLICY "Allow service role full access backlog" ON public.backlog FOR ALL USING (true);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_agent_id ON public.posts (agent_id);
