-- Seed Calendar Demo Data for Release Compass
-- Project: b434c7af-5501-4ef7-a640-9cb19b2fe28d (Implementation Test - Test Album)
-- Release Date: 2026-06-15

-- Add demo content items (marketing content captured during production)
INSERT INTO content_items (id, project_id, content_type, capture_context, storage_key, caption_draft, intended_platforms, created_at, uploaded_by, milestone_id, posting_status)
VALUES
  -- Short videos
  ('content-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'short_video', 'recording_session', 'demo/video-1.mp4', 'Behind the scenes in the studio 🎤', 'tiktok,instagram', datetime('now', '-45 days'), 'demo-user-uuid', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'not_posted'),

  ('content-2', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'short_video', 'recording_session', 'demo/video-2.mp4', 'Recording vocals for the new track 🔥', 'tiktok,instagram', datetime('now', '-40 days'), 'demo-user-uuid', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'not_posted'),

  ('content-3', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'short_video', 'mixing_session', 'demo/video-3.mp4', 'Mixing session vibes ✨', 'tiktok,youtube_shorts', datetime('now', '-30 days'), 'demo-user-uuid', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'not_posted'),

  -- Photos
  ('content-4', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'photo', 'recording_session', 'demo/photo-1.jpg', 'Studio session 📸', 'instagram', datetime('now', '-35 days'), 'demo-user-uuid', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'not_posted'),

  ('content-5', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'photo', 'behind_the_scenes', 'demo/photo-2.jpg', 'Team vibes 🎶', 'instagram,twitter', datetime('now', '-25 days'), 'demo-user-uuid', NULL, 'not_posted'),

  ('content-6', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'photo', 'promotional_shoot', 'demo/photo-3.jpg', 'Album artwork sneak peek 👀', 'instagram', datetime('now', '-15 days'), 'demo-user-uuid', '5adde397-bc25-4ec1-b832-582add6777f2', 'not_posted'),

  -- Long video
  ('content-7', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'long_video', 'behind_the_scenes', 'demo/long-video-1.mp4', 'Full studio session documentary', 'youtube', datetime('now', '-20 days'), 'demo-user-uuid', NULL, 'not_posted'),

  -- Voice memo
  ('content-8', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'voice_memo', 'creative_moment', 'demo/voice-1.m4a', 'Quick idea I had...', 'instagram_story', datetime('now', '-10 days'), 'demo-user-uuid', NULL, 'not_posted');

-- Add scheduled content posts (strategic posting timeline)
INSERT INTO content_schedule (id, content_id, scheduled_date, scheduled_platforms, scheduling_notes, created_at, created_by)
VALUES
  -- 4 weeks before release (May 18, 2026)
  ('schedule-1', 'content-1', '2026-05-18', 'tiktok,instagram', '4 weeks before release - Build anticipation', datetime('now'), 'demo-user-uuid'),

  -- 3 weeks before release (May 25, 2026)
  ('schedule-2', 'content-2', '2026-05-25', 'tiktok,instagram', '3 weeks before release - Studio vibes', datetime('now'), 'demo-user-uuid'),

  -- 2 weeks before release (June 1, 2026)
  ('schedule-3', 'content-4', '2026-06-01', 'instagram', '2 weeks before release - Behind the scenes', datetime('now'), 'demo-user-uuid'),

  -- 1 week before release (June 8, 2026)
  ('schedule-4', 'content-6', '2026-06-08', 'instagram', '1 week before release - Artwork reveal', datetime('now'), 'demo-user-uuid'),

  -- 3 days before release (June 12, 2026)
  ('schedule-5', 'content-3', '2026-06-12', 'tiktok,youtube_shorts', '3 days countdown - Mixing session', datetime('now'), 'demo-user-uuid'),

  -- Release day (June 15, 2026)
  ('schedule-6', 'content-7', '2026-06-15', 'youtube', 'Release day - Full documentary', datetime('now'), 'demo-user-uuid');
