-- Add content scheduling table for calendar functionality
CREATE TABLE IF NOT EXISTS content_schedule (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_platforms TEXT, -- Comma-separated list
  scheduling_notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_content_schedule_date ON content_schedule(scheduled_date);
CREATE INDEX idx_content_schedule_content ON content_schedule(content_id);
