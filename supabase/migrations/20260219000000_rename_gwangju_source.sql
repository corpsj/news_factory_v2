-- Rename "광주광역시" → "광주시" across all tables
UPDATE press_releases SET source = '광주시' WHERE source = '광주광역시';
UPDATE articles SET source = '광주시' WHERE source = '광주광역시';
UPDATE crawl_logs SET site_name = '광주시' WHERE site_name = '광주광역시';
