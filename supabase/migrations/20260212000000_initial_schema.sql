CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS press_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_id text NOT NULL UNIQUE,
  source text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  link text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at timestamptz NOT NULL,
  embedding vector(1024),
  status text NOT NULL DEFAULT 'collected' CHECK (status IN ('collected', 'embedded', 'processed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_release_id uuid NOT NULL REFERENCES press_releases(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  body text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text NOT NULL CHECK (category IN ('economy', 'politics', 'society', 'sports', 'culture', 'opinion', 'editorial')),
  source text NOT NULL,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'available', 'distributed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key_hash text NOT NULL UNIQUE,
  webhook_url text,
  webhook_secret text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crawl_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL,
  site_url text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  articles_found int NOT NULL DEFAULT 0,
  articles_new int NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  article_ids uuid[] NOT NULL DEFAULT '{}',
  article_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  delivered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_press_releases_source ON press_releases(source);
CREATE INDEX IF NOT EXISTS idx_press_releases_published_at ON press_releases(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_press_releases_status ON press_releases(status);
CREATE INDEX IF NOT EXISTS idx_articles_press_release_id ON articles(press_release_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_status ON crawl_logs(status);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_started_at ON crawl_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_client_id ON delivery_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_delivered_at ON delivery_logs(delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_press_releases_embedding_hnsw
ON press_releases
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE OR REPLACE FUNCTION match_press_releases(
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  origin_id text,
  source text,
  title text,
  content text,
  link text,
  images jsonb,
  attachments jsonb,
  published_at timestamptz,
  status text,
  created_at timestamptz,
  processed_at timestamptz,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pr.id,
    pr.origin_id,
    pr.source,
    pr.title,
    pr.content,
    pr.link,
    pr.images,
    pr.attachments,
    pr.published_at,
    pr.status,
    pr.created_at,
    pr.processed_at,
    1 - (pr.embedding <=> query_embedding) AS similarity
  FROM press_releases pr
  WHERE pr.embedding IS NOT NULL
    AND 1 - (pr.embedding <=> query_embedding) >= match_threshold
  ORDER BY pr.embedding <=> query_embedding
  LIMIT match_count;
$$;
