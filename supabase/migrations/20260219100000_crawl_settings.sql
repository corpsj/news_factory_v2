CREATE TABLE IF NOT EXISTS crawl_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled_site_ids text[] NOT NULL DEFAULT '{}',
  schedule_hours int[] NOT NULL DEFAULT ARRAY[6, 12, 18],
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO crawl_settings (id, enabled_site_ids, schedule_hours)
VALUES (
  1,
  ARRAY[
    'gwangju-city','donggu','seogu','namgu','bukgu','gwangsan',
    'jeonnam-province','mokpo','yeosu','suncheon','naju','gwangyang',
    'damyang','gokseong','gurye','goheung','boseong','hwasun',
    'jangheung','gangjin','haenam','muan','hampyeong','yeonggwang',
    'jangseong','wando','shinan'
  ],
  ARRAY[6, 12, 18]
)
ON CONFLICT (id) DO NOTHING;
