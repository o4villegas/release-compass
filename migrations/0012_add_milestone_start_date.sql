-- Add start_date column to milestones table for Gantt timeline visualization
-- Migration 0012
-- Date: 2025-10-14

-- Add start_date column (nullable, will calculate default values after)
ALTER TABLE milestones ADD COLUMN start_date TEXT;

-- Set default start_date values based on existing due_dates
-- For milestones without start_date, set it to 14 days before due_date
-- This provides a reasonable default timeline span for Gantt visualization
UPDATE milestones
SET start_date = date(due_date, '-14 days')
WHERE start_date IS NULL;
