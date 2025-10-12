-- ============================================================================
-- REMOVE STALE DEMO PROJECT
-- ============================================================================
-- Purpose: Clean up duplicate demo project to prevent 404 errors
-- Issue: React Router prefetch requests causing 404 for stale project ID
-- Stale Project ID: b199c34c-6641-496a-9832-b962d9563a74
-- Official Project ID: b434c7af-5501-4ef7-a640-9cb19b2fe28d (linked from home page)
-- Date: 2025-10-12
-- ============================================================================

-- Note: Foreign key constraints will cascade deletes automatically
-- Order matters: Delete child records first, then parent project

-- Delete content schedule entries for stale project
DELETE FROM content_schedule
WHERE content_id IN (
  SELECT id FROM content_items WHERE project_id = 'b199c34c-6641-496a-9832-b962d9563a74'
);

-- Delete file notes for stale project files
DELETE FROM file_notes
WHERE file_id IN (
  SELECT id FROM files WHERE project_id = 'b199c34c-6641-496a-9832-b962d9563a74'
);

-- Delete milestone content requirements for stale project milestones
DELETE FROM milestone_content_requirements
WHERE milestone_id IN (
  SELECT id FROM milestones WHERE project_id = 'b199c34c-6641-496a-9832-b962d9563a74'
);

-- Delete content items for stale project
DELETE FROM content_items
WHERE project_id = 'b199c34c-6641-496a-9832-b962d9563a74';

-- Delete budget items for stale project
DELETE FROM budget_items
WHERE project_id = 'b199c34c-6641-496a-9832-b962d9563a74';

-- Delete files for stale project
DELETE FROM files
WHERE project_id = 'b199c34c-6641-496a-9832-b962d9563a74';

-- Delete teaser posts for stale project
DELETE FROM teaser_posts
WHERE project_id = 'b199c34c-6641-496a-9832-b962d9563a74';

-- Delete milestones for stale project
DELETE FROM milestones
WHERE project_id = 'b199c34c-6641-496a-9832-b962d9563a74';

-- Finally, delete the stale project itself
DELETE FROM projects
WHERE id = 'b199c34c-6641-496a-9832-b962d9563a74';

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to confirm success)
-- ============================================================================

-- Should return 0 rows (stale project deleted)
-- SELECT * FROM projects WHERE id = 'b199c34c-6641-496a-9832-b962d9563a74';

-- Should return 1 row (official demo project remains)
-- SELECT * FROM projects WHERE id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

-- Should return 1 (only one demo project with this name/artist combo)
-- SELECT COUNT(*) as demo_projects_remaining
-- FROM projects
-- WHERE artist_name = 'Implementation Test' AND release_title = 'Test Album';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
