-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  artist_name TEXT NOT NULL,
  release_title TEXT NOT NULL,
  release_date TEXT NOT NULL,
  release_type TEXT NOT NULL, -- single/EP/album
  total_budget INTEGER NOT NULL,
  cleared_for_release INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

-- Milestones table
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  blocks_release INTEGER DEFAULT 0,
  proof_required INTEGER DEFAULT 0,
  proof_file TEXT,
  content_quota_met INTEGER DEFAULT 0,
  completed_at TEXT,
  completed_by TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Budget items table
CREATE TABLE budget_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  receipt_file TEXT,
  approval_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Files table with user-input metadata
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  uploaded_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  metadata_complete INTEGER DEFAULT 0,
  metadata_json TEXT,
  artwork_storage_key TEXT,
  artwork_width INTEGER,
  artwork_height INTEGER,
  metadata_completed_at TEXT,
  notes_acknowledged INTEGER DEFAULT 0,
  notes_acknowledged_at TEXT,
  notes_acknowledged_by TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- File timestamp notes for production feedback
CREATE TABLE file_notes (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id)
);

-- Users table (simplified for demo)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  user_uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Alerts table
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  alert_key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  dismissed INTEGER DEFAULT 0,
  dismissed_by TEXT,
  dismissed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Content items table (core feature)
CREATE TABLE content_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  milestone_id TEXT,
  content_type TEXT NOT NULL,
  capture_context TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  duration_seconds INTEGER,
  caption_draft TEXT,
  intended_platforms TEXT,
  approved_for_posting INTEGER DEFAULT 0,
  posting_status TEXT DEFAULT 'not_posted',
  posted_at TEXT,
  posted_platforms TEXT,
  engagement_notes TEXT,
  created_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

-- Milestone content requirements
CREATE TABLE milestone_content_requirements (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  minimum_count INTEGER NOT NULL,
  FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

-- Teaser posts tracking
CREATE TABLE teaser_posts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  post_url TEXT NOT NULL,
  snippet_duration INTEGER NOT NULL,
  song_section TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  presave_link_included INTEGER DEFAULT 0,
  engagement_metrics TEXT,
  source_content_id TEXT,
  created_by TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (source_content_id) REFERENCES content_items(id)
);

-- Indexes for performance
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_budget_items_project ON budget_items(project_id);
CREATE INDEX idx_content_items_project ON content_items(project_id);
CREATE INDEX idx_content_items_milestone ON content_items(milestone_id);
CREATE INDEX idx_alerts_project_active ON alerts(project_id, dismissed);
CREATE INDEX idx_files_project_type ON files(project_id, file_type);
CREATE INDEX idx_users_uuid ON users(user_uuid);
