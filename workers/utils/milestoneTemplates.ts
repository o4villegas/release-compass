// Milestone templates with content requirements
// Based on development_guide.md Phase 1.3

export interface MilestoneTemplate {
  name: string;
  description: string;
  days_before_release: number;
  blocks_release: boolean;
  proof_required: boolean;
  content_requirements: Array<{
    type: string;
    count: number;
  }>;
}

export const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  {
    name: 'Recording Complete',
    description: 'All tracks recorded and ready for mixing',
    days_before_release: 90,
    blocks_release: false,
    proof_required: false,
    content_requirements: [
      { type: 'short_video', count: 3 },
      { type: 'photo', count: 10 },
      { type: 'voice_memo', count: 1 }
    ]
  },
  {
    name: 'Mixing Complete',
    description: 'All tracks mixed and ready for mastering',
    days_before_release: 60,
    blocks_release: false,
    proof_required: false,
    content_requirements: [
      { type: 'short_video', count: 2 },
      { type: 'photo', count: 5 },
      { type: 'voice_memo', count: 1 }
    ]
  },
  {
    name: 'Mastering Complete',
    description: 'Final master approved and ready for distribution',
    days_before_release: 45,
    blocks_release: false,
    proof_required: false,
    content_requirements: [
      { type: 'short_video', count: 2 },
      { type: 'photo', count: 5 }
    ]
  },
  {
    name: 'Metadata Tagging Complete',
    description: 'All metadata (ISRC, UPC, credits) finalized',
    days_before_release: 35,
    blocks_release: true,
    proof_required: true,
    content_requirements: []
  },
  {
    name: 'Artwork Finalized',
    description: 'Album artwork approved and ready',
    days_before_release: 30,
    blocks_release: false,
    proof_required: true,
    content_requirements: []
  },
  {
    name: 'Teaser Content Released',
    description: 'Minimum 2 teaser posts published',
    days_before_release: 24, // midpoint of 21-28 day window
    blocks_release: false,
    proof_required: false,
    content_requirements: []
  },
  {
    name: 'Upload to Distributor',
    description: 'Release uploaded to distribution platform',
    days_before_release: 30,
    blocks_release: true,
    proof_required: true,
    content_requirements: []
  },
  {
    name: 'Spotify Playlist Submission',
    description: 'Submitted for Spotify editorial consideration',
    days_before_release: 28,
    blocks_release: true,
    proof_required: true,
    content_requirements: []
  },
  {
    name: 'Marketing Campaign Launch',
    description: 'Active marketing campaign running',
    days_before_release: 21,
    blocks_release: false,
    proof_required: false,
    content_requirements: [
      { type: 'short_video', count: 6 },
      { type: 'photo', count: 15 }
    ]
  },
  {
    name: 'Pre-Save Campaign Active',
    description: 'Pre-save/pre-add links live and promoted',
    days_before_release: 21,
    blocks_release: false,
    proof_required: false,
    content_requirements: []
  },
  {
    name: 'Release Day',
    description: 'Music goes live on all platforms',
    days_before_release: 0,
    blocks_release: true,
    proof_required: false,
    content_requirements: []
  }
];

/**
 * Calculate milestone due dates based on release date
 */
export function calculateMilestoneDueDate(releaseDate: string, daysBeforeRelease: number): string {
  const release = new Date(releaseDate);
  const dueDate = new Date(release);
  dueDate.setDate(dueDate.getDate() - daysBeforeRelease);
  return dueDate.toISOString();
}

/**
 * Generate milestone objects from templates for a project
 */
export function generateMilestonesForProject(
  projectId: string,
  releaseDate: string
): Array<{
  id: string;
  project_id: string;
  name: string;
  description: string;
  due_date: string;
  status: string;
  blocks_release: number;
  proof_required: number;
  created_at: string;
  content_requirements: Array<{ type: string; count: number }>;
}> {
  const now = new Date().toISOString();

  return MILESTONE_TEMPLATES.map((template) => ({
    id: crypto.randomUUID(),
    project_id: projectId,
    name: template.name,
    description: template.description,
    due_date: calculateMilestoneDueDate(releaseDate, template.days_before_release),
    status: 'pending',
    blocks_release: template.blocks_release ? 1 : 0,
    proof_required: template.proof_required ? 1 : 0,
    created_at: now,
    content_requirements: template.content_requirements
  }));
}
