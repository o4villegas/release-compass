// Database types matching our schema

export interface Project {
  id: string;
  artist_name: string;
  release_title: string;
  release_date: string; // ISO date string
  release_type: 'single' | 'EP' | 'album';
  total_budget: number;
  cleared_for_release: number; // 0 or 1 (SQLite boolean)
  artwork_storage_key: string | null;
  artwork_width: number | null;
  artwork_height: number | null;
  created_at: string;
  created_by: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string; // ISO date string
  status: 'pending' | 'in_progress' | 'complete' | 'overdue';
  blocks_release: number; // 0 or 1
  proof_required: number; // 0 or 1
  proof_file: string | null;
  content_quota_met: number; // 0 or 1
  completed_at: string | null;
  completed_by: string | null;
  assigned_to: string | null;
  created_at: string;
}

export interface MilestoneContentRequirement {
  id: string;
  milestone_id: string;
  content_type: string;
  minimum_count: number;
}

export interface ContentItem {
  id: string;
  project_id: string;
  milestone_id: string | null;
  content_type: 'short_video' | 'long_video' | 'photo' | 'voice_memo' | 'live_performance' | 'team_meeting';
  capture_context: string;
  storage_key: string;
  duration_seconds: number | null;
  caption_draft: string | null;
  intended_platforms: string | null;
  approved_for_posting: number; // 0 or 1
  posting_status: 'not_posted' | 'scheduled' | 'posted';
  posted_at: string | null;
  posted_platforms: string | null;
  engagement_notes: string | null;
  created_at: string;
  uploaded_by: string;
}

export interface BudgetItem {
  id: string;
  project_id: string;
  category: 'production' | 'marketing' | 'distribution' | 'admin' | 'content_creation' | 'contingency';
  description: string;
  amount: number;
  receipt_file: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  created_by: string;
}

export interface User {
  id: string;
  user_uuid: string;
  name: string;
  created_at: string;
}

// API request/response types

export interface CreateProjectRequest {
  artist_name: string;
  release_title: string;
  release_date: string; // ISO date string
  release_type: 'single' | 'EP' | 'album';
  total_budget: number;
  user_uuid: string;
  // Artwork uploaded as FormData (file + dimensions)
  artwork?: File;
  artwork_width?: number;
  artwork_height?: number;
}

export interface CreateProjectResponse {
  project: Project;
  milestones: Milestone[];
}

export interface ClearedForReleaseResult {
  cleared: boolean;
  reasons: string[];
  missing_requirements: {
    milestones?: string[];
    budget?: string[];
    legal?: string[];
    files?: string[];
  };
}

export interface ProjectWithMilestones {
  project: Project;
  milestones: Milestone[];
  budget_summary?: {
    total_spent: number;
    by_category: Record<string, number>;
  };
  cleared_for_release?: ClearedForReleaseResult;
}

export interface ProjectSummary {
  id: string;
  artist_name: string;
  release_title: string;
  release_date: string;
  release_type: 'single' | 'EP' | 'album';
  total_budget: number;
  cleared_for_release: number;
  artwork_storage_key: string | null;
  artwork_width: number | null;
  artwork_height: number | null;
  artwork_url?: string | null; // Presigned download URL (generated dynamically)
  created_at: string;
  // Aggregated stats
  milestones_total: number;
  milestones_complete: number;
  budget_spent: number;
  content_items_count: number;
}
