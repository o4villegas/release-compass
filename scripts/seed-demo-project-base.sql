-- ============================================================================
-- DEMO PROJECT BASE SEED SCRIPT
-- ============================================================================
-- Purpose: Create base structure for official demo project
-- Project ID: b434c7af-5501-4ef7-a640-9cb19b2fe28d
-- Artist: Implementation Test
-- Release: Test Album
--
-- This script creates the foundational data that enhance-demo-project.sql
-- depends on. Run this FIRST, then run enhance-demo-project.sql.
--
-- Date: 2025-10-12
-- ============================================================================

-- ============================================================================
-- STEP 1: INSERT PROJECT RECORD
-- ============================================================================

INSERT INTO projects (
  id,
  artist_name,
  release_title,
  release_type,
  release_date,
  total_budget,
  created_at,
  created_by
) VALUES (
  'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
  'Implementation Test',
  'Test Album',
  'album',
  '2026-06-15',
  50000,
  '2025-10-08T16:15:49.932Z',
  'test-impl-001'
);

-- ============================================================================
-- STEP 2: INSERT MILESTONES (11 total)
-- ============================================================================

INSERT INTO milestones (
  id,
  project_id,
  name,
  description,
  due_date,
  status,
  blocks_release,
  proof_required,
  proof_file,
  content_quota_met,
  completed_at,
  completed_by,
  assigned_to,
  created_at
) VALUES
  -- Recording Complete
  (
    'd3efdf2d-d816-4e70-b605-63e9e4079802',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Recording Complete',
    'All tracks recorded and ready for mixing',
    '2026-03-17T00:00:00.000Z',
    'pending',
    0,
    0,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Mixing Complete
  (
    'edc7fafc-2f76-4027-8ca4-a6eaf731149f',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Mixing Complete',
    'All tracks mixed and ready for mastering',
    '2026-04-16T00:00:00.000Z',
    'pending',
    0,
    0,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Mastering Complete
  (
    '810f413b-82fc-456c-8a8b-9d968eba2361',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Mastering Complete',
    'Final master approved and ready for distribution',
    '2026-05-01T00:00:00.000Z',
    'pending',
    0,
    0,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Metadata Tagging Complete
  (
    'ca29a74e-b90c-489c-afc3-732a8df37b28',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Metadata Tagging Complete',
    'All metadata (ISRC, UPC, credits) finalized',
    '2026-05-11T00:00:00.000Z',
    'pending',
    1,
    1,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Artwork Finalized
  (
    '5adde397-bc25-4ec1-b832-582add6777f2',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Artwork Finalized',
    'Album artwork approved and ready',
    '2026-05-16T00:00:00.000Z',
    'pending',
    0,
    1,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Upload to Distributor
  (
    'f5319896-0685-47d4-b4ea-c020b2053ba0',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Upload to Distributor',
    'Release uploaded to distribution platform',
    '2026-05-16T00:00:00.000Z',
    'pending',
    1,
    1,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Spotify Playlist Submission
  (
    'de73f103-5fc1-4d7a-80a7-1ca307edd7cc',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Spotify Playlist Submission',
    'Submit to Spotify editorial playlists',
    '2026-05-21T00:00:00.000Z',
    'pending',
    0,
    1,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Teaser Content Released
  (
    '8451844b-163d-4157-bdec-d37a5d888d7f',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Teaser Content Released',
    'At least 2 teaser posts published',
    '2026-05-26T00:00:00.000Z',
    'pending',
    0,
    0,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Marketing Campaign Launch
  (
    '53f14235-4ae0-4db5-980b-4c66e9bef746',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Marketing Campaign Launch',
    'Full marketing push begins',
    '2026-05-31T00:00:00.000Z',
    'pending',
    0,
    0,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Pre-Save Campaign Active
  (
    '9d7744bb-f2fd-4964-92a0-56564fb7ea75',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Pre-Save Campaign Active',
    'Pre-save links live and promoted',
    '2026-06-01T00:00:00.000Z',
    'pending',
    0,
    0,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  ),
  -- Release Day
  (
    '0550085f-60fb-4c94-8f51-3467d56aeb7e',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    'Release Day',
    'Album goes live on all platforms',
    '2026-06-15T00:00:00.000Z',
    'pending',
    0,
    0,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    '2025-10-08T16:15:49.949Z'
  );

-- ============================================================================
-- STEP 3: INSERT MILESTONE CONTENT REQUIREMENTS (10 total)
-- ============================================================================

INSERT INTO milestone_content_requirements (
  id,
  milestone_id,
  content_type,
  minimum_count
) VALUES
  -- Recording Complete requirements (3 types)
  (
    'd95bf09c-da29-4812-a3a2-6e3e2f0e671c',
    'd3efdf2d-d816-4e70-b605-63e9e4079802',
    'photo',
    10
  ),
  (
    '33069a55-ea3d-474c-8fe4-cb4250034be8',
    'd3efdf2d-d816-4e70-b605-63e9e4079802',
    'short_video',
    3
  ),
  (
    '24e94d26-54a5-4b02-a2f2-c4bcc5d8b285',
    'd3efdf2d-d816-4e70-b605-63e9e4079802',
    'voice_memo',
    1
  ),
  -- Mixing Complete requirements (3 types)
  (
    '37f81e3a-fc6c-4235-a03a-d3b76650ae45',
    'edc7fafc-2f76-4027-8ca4-a6eaf731149f',
    'photo',
    5
  ),
  (
    '79ab92f4-1989-4c06-b7cb-027ec33082bd',
    'edc7fafc-2f76-4027-8ca4-a6eaf731149f',
    'short_video',
    2
  ),
  (
    'b1819bc0-9f01-41e7-9c63-cea4e5e20013',
    'edc7fafc-2f76-4027-8ca4-a6eaf731149f',
    'voice_memo',
    1
  ),
  -- Mastering Complete requirements (2 types)
  (
    'c5fe90eb-ed71-45d6-bf33-7baee9024cea',
    '810f413b-82fc-456c-8a8b-9d968eba2361',
    'photo',
    5
  ),
  (
    'fae3b070-6d69-4ee8-9aa0-253d84846aa8',
    '810f413b-82fc-456c-8a8b-9d968eba2361',
    'short_video',
    2
  ),
  -- Marketing Campaign Launch requirements (2 types)
  (
    'ca2f1d00-842a-4058-9974-ec1adf3e223d',
    '53f14235-4ae0-4db5-980b-4c66e9bef746',
    'photo',
    15
  ),
  (
    '6a46e3bc-fd4a-4889-90e4-02355ca384e1',
    '53f14235-4ae0-4db5-980b-4c66e9bef746',
    'short_video',
    6
  );

-- ============================================================================
-- STEP 4: INSERT BASE CONTENT ITEMS (8 total)
-- ============================================================================
-- These are referenced by enhance-demo-project.sql UPDATE statements
-- They must exist before running the enhancement script

INSERT INTO content_items (
  id,
  project_id,
  milestone_id,
  content_type,
  capture_context,
  storage_key,
  duration_seconds,
  caption_draft,
  intended_platforms,
  approved_for_posting,
  posting_status,
  posted_at,
  posted_platforms,
  engagement_notes,
  created_at,
  uploaded_by
) VALUES
  -- content-1: short_video
  (
    'content-1',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    NULL,
    'short_video',
    'recording_session',
    'demo/video-1.mp4',
    NULL,
    'Behind the scenes in the studio',
    'tiktok,instagram',
    0,
    'not_posted',
    NULL,
    NULL,
    NULL,
    '2025-08-26T01:59:26.000Z',
    'demo-user-uuid'
  ),
  -- content-2: short_video
  (
    'content-2',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    NULL,
    'short_video',
    'recording_session',
    'demo/video-2.mp4',
    NULL,
    'Recording vocals for the new track',
    'tiktok,instagram',
    0,
    'not_posted',
    NULL,
    NULL,
    NULL,
    '2025-08-31T01:59:26.000Z',
    'demo-user-uuid'
  ),
  -- content-3: short_video
  (
    'content-3',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    NULL,
    'short_video',
    'mixing_session',
    'demo/video-3.mp4',
    NULL,
    'Mixing session vibes',
    'tiktok,youtube_shorts',
    0,
    'not_posted',
    NULL,
    NULL,
    NULL,
    '2025-09-10T01:59:26.000Z',
    'demo-user-uuid'
  ),
  -- content-4: photo
  (
    'content-4',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    NULL,
    'photo',
    'recording_session',
    'demo/photo-1.jpg',
    NULL,
    'Studio session',
    'instagram',
    0,
    'not_posted',
    NULL,
    NULL,
    NULL,
    '2025-09-05T01:59:26.000Z',
    'demo-user-uuid'
  ),
  -- content-5: photo
  (
    'content-5',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    NULL,
    'photo',
    'behind_the_scenes',
    'demo/photo-2.jpg',
    NULL,
    'Team vibes',
    'instagram,twitter',
    0,
    'not_posted',
    NULL,
    NULL,
    NULL,
    '2025-09-15T01:59:26.000Z',
    'demo-user-uuid'
  ),
  -- content-6: photo
  (
    'content-6',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    NULL,
    'photo',
    'promotional_shoot',
    'demo/photo-3.jpg',
    NULL,
    'Album artwork sneak peek',
    'instagram',
    0,
    'not_posted',
    NULL,
    NULL,
    NULL,
    '2025-09-25T01:59:26.000Z',
    'demo-user-uuid'
  ),
  -- content-7: long_video
  (
    'content-7',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    NULL,
    'long_video',
    'behind_the_scenes',
    'demo/long-video-1.mp4',
    NULL,
    'Full studio session documentary',
    'youtube',
    0,
    'not_posted',
    NULL,
    NULL,
    NULL,
    '2025-09-20T01:59:26.000Z',
    'demo-user-uuid'
  ),
  -- content-8: voice_memo
  (
    'content-8',
    'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
    NULL,
    'voice_memo',
    'creative_moment',
    'demo/voice-1.m4a',
    NULL,
    'Quick idea I had...',
    'instagram_story',
    0,
    'not_posted',
    NULL,
    NULL,
    NULL,
    '2025-09-30T01:59:26.000Z',
    'demo-user-uuid'
  );

-- ============================================================================
-- VERIFICATION QUERIES (run after script to confirm success)
-- ============================================================================

-- Should return 1 row (project exists)
-- SELECT * FROM projects WHERE id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

-- Should return 11 rows (all milestones)
-- SELECT COUNT(*) as milestone_count FROM milestones 
-- WHERE project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

-- Should return 10 rows (all requirements)
-- SELECT COUNT(*) as requirement_count FROM milestone_content_requirements
-- WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d');

-- Should return 8 rows (base content items)
-- SELECT COUNT(*) as content_count FROM content_items
-- WHERE project_id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

-- ============================================================================
-- NEXT STEP
-- ============================================================================
-- After verifying this script succeeds, run:
-- wrangler d1 execute music_releases_db --file=scripts/enhance-demo-project.sql
--
-- The enhancement script will:
-- 1. Link content-1 through content-8 to milestones (UPDATE statements)
-- 2. Insert additional demo content (22 more items)
-- 3. Insert demo files with metadata
-- 4. Insert teaser post
-- 5. Update milestone statuses to show progress
-- ============================================================================

-- END OF BASE SEED SCRIPT
