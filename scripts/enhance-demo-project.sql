-- ============================================================================
-- DEMO PROJECT ENHANCEMENT SCRIPT
-- ============================================================================
-- Project: b434c7af-5501-4ef7-a640-9cb19b2fe28d (Test Album by Implementation Test)
-- Purpose: Populate demo data to demonstrate Release Compass breakthrough features
-- Date: 2025-10-12
-- ============================================================================

-- Milestone IDs (verified from database):
-- d3efdf2d-d816-4e70-b605-63e9e4079802 = Recording Complete
-- edc7fafc-2f76-4027-8ca4-a6eaf731149f = Mixing Complete
-- 810f413b-82fc-456c-8a8b-9d968eba2361 = Mastering Complete
-- ca29a74e-b90c-489c-afc3-732a8df37b28 = Metadata Tagging Complete
-- 5adde397-bc25-4ec1-b832-582add6777f2 = Artwork Finalized
-- f5319896-0685-47d4-b4ea-c020b2053ba0 = Upload to Distributor
-- de73f103-5fc1-4d7a-80a7-1ca307edd7cc = Spotify Playlist Submission
-- 8451844b-163d-4157-bdec-d37a5d888d7f = Teaser Content Released
-- 53f14235-4ae0-4db5-980b-4c66e9bef746 = Marketing Campaign Launch
-- 9d7744bb-f2fd-4964-92a0-56564fb7ea75 = Pre-Save Campaign Active
-- 0550085f-60fb-4c94-8f51-3467d56aeb7e = Release Day

-- ============================================================================
-- PHASE 1: LINK EXISTING CONTENT TO MILESTONES
-- ============================================================================

-- Link 3 existing short videos to Recording milestone (meets 3/3 requirement)
UPDATE content_items
SET milestone_id = 'd3efdf2d-d816-4e70-b605-63e9e4079802'
WHERE id IN ('content-1', 'content-2', 'content-3')
  AND project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

-- Link 3 existing photos to Recording milestone (partial: 3/10 needed)
UPDATE content_items
SET milestone_id = 'd3efdf2d-d816-4e70-b605-63e9e4079802'
WHERE id IN ('content-4', 'content-5', 'content-6')
  AND project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

-- Link 1 voice memo to Recording milestone (meets 1/1 requirement)
UPDATE content_items
SET milestone_id = 'd3efdf2d-d816-4e70-b605-63e9e4079802'
WHERE id = 'content-8'
  AND project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

-- Add 7 more photos to Recording milestone (to reach 10/10 total)
INSERT INTO content_items (id, project_id, milestone_id, content_type, capture_context, storage_key, duration_seconds, caption_draft, intended_platforms, approved_for_posting, posting_status, posted_at, posted_platforms, engagement_notes, created_at, uploaded_by) VALUES
  ('demo-recording-photo-4', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'photo', 'recording_session', 'demo/recording-photo-4.jpg', NULL, 'Vocal booth setup with acoustic panels', 'Instagram,TikTok', 0, 'not_posted', NULL, NULL, NULL, '2026-03-10T14:30:00Z', 'test-impl-001'),
  ('demo-recording-photo-5', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'photo', 'recording_session', 'demo/recording-photo-5.jpg', NULL, 'Close-up of vintage microphone', 'Instagram', 0, 'not_posted', NULL, NULL, NULL, '2026-03-10T15:00:00Z', 'test-impl-001'),
  ('demo-recording-photo-6', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'photo', 'recording_session', 'demo/recording-photo-6.jpg', NULL, 'Artist headphones on during take', 'Instagram,Facebook', 0, 'not_posted', NULL, NULL, NULL, '2026-03-11T10:00:00Z', 'test-impl-001'),
  ('demo-recording-photo-7', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'photo', 'recording_session', 'demo/recording-photo-7.jpg', NULL, 'Studio monitors and mixing desk', 'Instagram,TikTok', 0, 'not_posted', NULL, NULL, NULL, '2026-03-11T14:00:00Z', 'test-impl-001'),
  ('demo-recording-photo-8', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'photo', 'behind_the_scenes', 'demo/recording-photo-8.jpg', NULL, 'Producer and artist reviewing takes', 'Instagram', 0, 'not_posted', NULL, NULL, NULL, '2026-03-12T11:30:00Z', 'test-impl-001'),
  ('demo-recording-photo-9', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'photo', 'behind_the_scenes', 'demo/recording-photo-9.jpg', NULL, 'Late night session vibes', 'Instagram,Twitter', 0, 'not_posted', NULL, NULL, NULL, '2026-03-13T22:00:00Z', 'test-impl-001'),
  ('demo-recording-photo-10', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'd3efdf2d-d816-4e70-b605-63e9e4079802', 'photo', 'recording_session', 'demo/recording-photo-10.jpg', NULL, 'Final recording session wrap photo', 'Instagram,Facebook,TikTok', 0, 'not_posted', NULL, NULL, NULL, '2026-03-17T16:00:00Z', 'test-impl-001');

-- ============================================================================
-- PHASE 2: CREATE CONTENT FOR MIXING MILESTONE
-- ============================================================================

-- Mixing milestone needs: 2 short_video, 5 photo, 1 voice_memo
INSERT INTO content_items (id, project_id, milestone_id, content_type, capture_context, storage_key, duration_seconds, caption_draft, intended_platforms, approved_for_posting, posting_status, posted_at, posted_platforms, engagement_notes, created_at, uploaded_by) VALUES
  ('demo-mixing-video-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'short_video', 'mixing_session', 'demo/mixing-vid-1.mp4', 45, 'Engineer balancing vocal levels', 'Instagram,TikTok', 0, 'not_posted', NULL, NULL, NULL, '2026-04-05T11:00:00Z', 'test-impl-001'),
  ('demo-mixing-video-2', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'short_video', 'mixing_session', 'demo/mixing-vid-2.mp4', 38, 'Before/after mix comparison', 'Instagram,YouTube', 0, 'not_posted', NULL, NULL, NULL, '2026-04-08T15:30:00Z', 'test-impl-001'),
  ('demo-mixing-photo-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'photo', 'mixing_session', 'demo/mixing-photo-1.jpg', NULL, 'Mixing console close-up', 'Instagram', 0, 'not_posted', NULL, NULL, NULL, '2026-04-06T10:00:00Z', 'test-impl-001'),
  ('demo-mixing-photo-2', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'photo', 'mixing_session', 'demo/mixing-photo-2.jpg', NULL, 'Artist listening to rough mix', 'Instagram,Twitter', 0, 'not_posted', NULL, NULL, NULL, '2026-04-08T14:00:00Z', 'test-impl-001'),
  ('demo-mixing-photo-3', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'photo', 'mixing_session', 'demo/mixing-photo-3.jpg', NULL, 'EQ curve on screen', 'Instagram', 0, 'not_posted', NULL, NULL, NULL, '2026-04-10T12:00:00Z', 'test-impl-001'),
  ('demo-mixing-photo-4', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'photo', 'behind_the_scenes', 'demo/mixing-photo-4.jpg', NULL, 'Producer making notes', 'Instagram', 0, 'not_posted', NULL, NULL, NULL, '2026-04-12T16:00:00Z', 'test-impl-001'),
  ('demo-mixing-photo-5', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'photo', 'mixing_session', 'demo/mixing-photo-5.jpg', NULL, 'Final mix session celebration', 'Instagram,Facebook', 0, 'not_posted', NULL, NULL, NULL, '2026-04-16T18:00:00Z', 'test-impl-001'),
  ('demo-mixing-memo-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'edc7fafc-2f76-4027-8ca4-a6eaf731149f', 'voice_memo', 'creative_moment', 'demo/mixing-memo-1.m4a', 120, 'Vocal mix direction ideas', NULL, 0, 'not_posted', NULL, NULL, NULL, '2026-04-09T13:00:00Z', 'test-impl-001');

-- ============================================================================
-- PHASE 3: CREATE CONTENT FOR MASTERING MILESTONE
-- ============================================================================

-- Mastering milestone needs: 2 short_video, 5 photo
INSERT INTO content_items (id, project_id, milestone_id, content_type, capture_context, storage_key, duration_seconds, caption_draft, intended_platforms, approved_for_posting, posting_status, posted_at, posted_platforms, engagement_notes, created_at, uploaded_by) VALUES
  ('demo-mastering-video-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', '810f413b-82fc-456c-8a8b-9d968eba2361', 'short_video', 'mastering_session', 'demo/mastering-vid-1.mp4', 30, 'Final master vs mix comparison', 'Instagram,YouTube', 0, 'not_posted', NULL, NULL, NULL, '2026-04-25T16:00:00Z', 'test-impl-001'),
  ('demo-mastering-video-2', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', '810f413b-82fc-456c-8a8b-9d968eba2361', 'short_video', 'mastering_session', 'demo/mastering-vid-2.mp4', 25, 'Mastering engineer at work', 'Instagram,TikTok', 0, 'not_posted', NULL, NULL, NULL, '2026-04-28T10:00:00Z', 'test-impl-001'),
  ('demo-mastering-photo-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', '810f413b-82fc-456c-8a8b-9d968eba2361', 'photo', 'mastering_session', 'demo/mastering-photo-1.jpg', NULL, 'Mastering suite setup', 'Instagram', 0, 'not_posted', NULL, NULL, NULL, '2026-04-26T09:00:00Z', 'test-impl-001'),
  ('demo-mastering-photo-2', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', '810f413b-82fc-456c-8a8b-9d968eba2361', 'photo', 'mastering_session', 'demo/mastering-photo-2.jpg', NULL, 'Waveform analysis', 'Instagram', 0, 'not_posted', NULL, NULL, NULL, '2026-04-27T14:00:00Z', 'test-impl-001'),
  ('demo-mastering-photo-3', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', '810f413b-82fc-456c-8a8b-9d968eba2361', 'photo', 'mastering_session', 'demo/mastering-photo-3.jpg', NULL, 'Listening on reference monitors', 'Instagram,Twitter', 0, 'not_posted', NULL, NULL, NULL, '2026-04-29T11:00:00Z', 'test-impl-001'),
  ('demo-mastering-photo-4', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', '810f413b-82fc-456c-8a8b-9d968eba2361', 'photo', 'mastering_session', 'demo/mastering-photo-4.jpg', NULL, 'Compression settings screen', 'Instagram', 0, 'not_posted', NULL, NULL, NULL, '2026-04-30T15:00:00Z', 'test-impl-001'),
  ('demo-mastering-photo-5', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', '810f413b-82fc-456c-8a8b-9d968eba2361', 'photo', 'mastering_session', 'demo/mastering-photo-5.jpg', NULL, 'Master approved stamp moment', 'Instagram,Facebook,TikTok', 0, 'not_posted', NULL, NULL, NULL, '2026-05-01T17:00:00Z', 'test-impl-001');

-- ============================================================================
-- PHASE 4: CREATE PRODUCTION FILES
-- ============================================================================

-- Master audio file with complete metadata
INSERT INTO files (id, project_id, file_type, storage_key, version, approval_status, approved_by, approved_at, uploaded_at, uploaded_by, metadata_complete, metadata_json, artwork_storage_key, artwork_width, artwork_height, metadata_completed_at, notes_acknowledged, notes_acknowledged_at, notes_acknowledged_by) VALUES
  ('demo-master-file-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'master', 'demo-project/master-final-v2.wav', 2, 'approved', 'test-impl-001', '2026-05-05T18:00:00Z', '2026-05-02T14:00:00Z', 'test-impl-001', 1, '{"isrc":"USZZ12600001","genre":"Electronic","explicit_content":false,"upc":"123456789012","duration_seconds":210,"format":"WAV","sample_rate":48000,"bit_depth":24,"title":"Test Album","artist":"Implementation Test"}', NULL, NULL, NULL, '2026-05-02T15:00:00Z', 1, '2026-05-05T17:00:00Z', 'test-impl-001');

-- Master file timestamp notes (both acknowledged)
INSERT INTO file_notes (id, file_id, timestamp_seconds, note_text, created_by, created_at) VALUES
  ('demo-note-1', 'demo-master-file-1', 45, 'Slight click noise at transition - fixed in v2', 'manager-001', '2026-05-03T10:00:00Z'),
  ('demo-note-2', 'demo-master-file-1', 123, 'Bass level perfect here, keep this balance', 'label-exec-001', '2026-05-03T14:30:00Z');

-- Stems file with UNACKNOWLEDGED note (demonstrates blocking)
INSERT INTO files (id, project_id, file_type, storage_key, version, approval_status, approved_by, approved_at, uploaded_at, uploaded_by, metadata_complete, metadata_json, artwork_storage_key, artwork_width, artwork_height, metadata_completed_at, notes_acknowledged, notes_acknowledged_at, notes_acknowledged_by) VALUES
  ('demo-stems-file-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'stems', 'demo-project/stems-pack.zip', 1, 'pending', NULL, NULL, '2026-05-02T14:30:00Z', 'engineer-001', 0, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL);

-- Stems file unacknowledged note
INSERT INTO file_notes (id, file_id, timestamp_seconds, note_text, created_by, created_at) VALUES
  ('demo-note-3', 'demo-stems-file-1', 0, 'Please organize stems by instrument type (drums, bass, synth, vocals) for easier mixing', 'manager-001', '2026-05-03T09:00:00Z');

-- Artwork file (3000x3000, meets requirements)
INSERT INTO files (id, project_id, file_type, storage_key, version, approval_status, approved_by, approved_at, uploaded_at, uploaded_by, metadata_complete, metadata_json, artwork_storage_key, artwork_width, artwork_height, metadata_completed_at, notes_acknowledged, notes_acknowledged_at, notes_acknowledged_by) VALUES
  ('demo-artwork-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'artwork', 'demo-project/album-artwork-final.png', 1, 'approved', 'test-impl-001', '2026-05-16T12:00:00Z', '2026-05-15T10:00:00Z', 'designer-001', 1, '{"format":"PNG","width":3000,"height":3000,"color_mode":"RGB"}', NULL, 3000, 3000, '2026-05-15T10:00:00Z', 0, NULL, NULL);

-- Contract file
INSERT INTO files (id, project_id, file_type, storage_key, version, approval_status, approved_by, approved_at, uploaded_at, uploaded_by, metadata_complete, metadata_json, artwork_storage_key, artwork_width, artwork_height, metadata_completed_at, notes_acknowledged, notes_acknowledged_at, notes_acknowledged_by) VALUES
  ('demo-contract-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'contracts', 'demo-project/recording-contract-signed.pdf', 1, 'approved', 'label-exec-001', '2026-03-01T16:00:00Z', '2026-02-28T14:00:00Z', 'test-impl-001', 1, '{"document_type":"recording_contract","signed":true,"effective_date":"2026-02-28"}', NULL, NULL, NULL, '2026-02-28T14:00:00Z', 0, NULL, NULL);

-- ============================================================================
-- PHASE 5: UPDATE MILESTONE STATUSES
-- ============================================================================

-- Mark Recording Complete as complete (quota met)
UPDATE milestones
SET status = 'complete',
    completed_at = '2026-03-17T18:00:00Z',
    completed_by = 'test-impl-001',
    content_quota_met = 1
WHERE id = 'd3efdf2d-d816-4e70-b605-63e9e4079802';

-- Mark Mixing Complete as complete (quota met)
UPDATE milestones
SET status = 'complete',
    completed_at = '2026-04-16T20:00:00Z',
    completed_by = 'test-impl-001',
    content_quota_met = 1
WHERE id = 'edc7fafc-2f76-4027-8ca4-a6eaf731149f';

-- Mark Mastering Complete as complete (quota met, notes acknowledged)
UPDATE milestones
SET status = 'complete',
    completed_at = '2026-05-05T19:00:00Z',
    completed_by = 'test-impl-001',
    content_quota_met = 1
WHERE id = '810f413b-82fc-456c-8a8b-9d968eba2361';

-- Mark Metadata Tagging Complete as complete (no requirements)
UPDATE milestones
SET status = 'complete',
    completed_at = '2026-05-11T14:00:00Z',
    completed_by = 'test-impl-001'
WHERE id = 'ca29a74e-b90c-489c-afc3-732a8df37b28';

-- Mark Artwork Finalized as complete (no requirements)
UPDATE milestones
SET status = 'complete',
    completed_at = '2026-05-16T15:00:00Z',
    completed_by = 'test-impl-001'
WHERE id = '5adde397-bc25-4ec1-b832-582add6777f2';

-- Set Upload to Distributor as in_progress
UPDATE milestones
SET status = 'in_progress'
WHERE id = 'f5319896-0685-47d4-b4ea-c020b2053ba0';

-- Set Marketing Campaign Launch as in_progress (quota NOT met - demonstrates blocking)
UPDATE milestones
SET status = 'in_progress',
    content_quota_met = 0
WHERE id = '53f14235-4ae0-4db5-980b-4c66e9bef746';

-- Remaining milestones stay as 'pending':
-- - Spotify Playlist Submission
-- - Teaser Content Released
-- - Pre-Save Campaign Active
-- - Release Day

-- ============================================================================
-- PHASE 6: CREATE TEASER POST (1/2 REQUIRED)
-- ============================================================================

-- Create 1 teaser post (demonstrates partial progress: 1/2 required)
INSERT INTO teaser_posts (id, project_id, platform, post_url, snippet_duration, song_section, posted_at, presave_link_included, engagement_metrics, source_content_id, created_by) VALUES
  ('demo-teaser-1', 'b434c7af-5501-4ef7-a640-9cb19b2fe28d', 'instagram', 'https://instagram.com/p/demo-test-album-teaser-1', 15, 'chorus', '2026-05-20T18:00:00Z', 1, '{"views":12500,"likes":890,"shares":234,"comments":156}', 'content-1', 'test-impl-001');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after script execution to verify data:
--
-- SELECT milestone_id, content_type, COUNT(*) as count
-- FROM content_items
-- WHERE project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d'
-- GROUP BY milestone_id, content_type;
--
-- SELECT name, status, content_quota_met
-- FROM milestones
-- WHERE project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d'
-- ORDER BY due_date;
--
-- SELECT file_type, notes_acknowledged, COUNT(*)
-- FROM files
-- WHERE project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d'
-- GROUP BY file_type, notes_acknowledged;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
