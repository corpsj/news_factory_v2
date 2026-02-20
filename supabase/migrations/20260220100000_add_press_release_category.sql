ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_category_check;

ALTER TABLE articles ADD CONSTRAINT articles_category_check
  CHECK (category IN ('economy', 'politics', 'society', 'sports', 'culture', 'opinion', 'editorial', 'press_release'));

UPDATE articles SET category = 'press_release' WHERE category != 'press_release';
