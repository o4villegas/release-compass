-- Migration 0011: Add artwork fields to projects table
-- Purpose: Enable album artwork storage at project level for visual-first UX
-- Date: 2025-10-13

-- Add artwork storage fields to projects table
ALTER TABLE projects ADD COLUMN artwork_storage_key TEXT;
ALTER TABLE projects ADD COLUMN artwork_width INTEGER;
ALTER TABLE projects ADD COLUMN artwork_height INTEGER;
