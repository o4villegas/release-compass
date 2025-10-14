/**
 * Teaser Posts Business Logic
 *
 * NOTE: UI calls this feature "Social" but internal naming is "teasers" (historical).
 * Database table: teaser_posts
 * UI route: /project/:id/social
 */
import type { D1Database } from '@cloudflare/workers-types';

export interface TeaserPost {
  id: string;
  project_id: string;
  platform: 'TikTok' | 'Instagram' | 'YouTube' | 'Twitter' | 'Facebook';
  post_url: string;
  snippet_duration: number;
  song_section: string;
  posted_at: string;
  presave_link_included: number;
  source_content_id?: string;
  created_by: string;
  engagement_metrics?: string;
}

export interface TeasersResponse {
  teasers: TeaserPost[];
  count: number;
  requirement: {
    required: number;
    actual: number;
    met: boolean;
  };
  optimal_posting_window: {
    start: string;
    end: string;
  } | null;
}

/**
 * Get all teasers for a project with requirement status
 */
export async function getProjectTeasers(
  db: D1Database,
  projectId: string
): Promise<TeasersResponse> {
  // Get all teasers
  const teasers = await db.prepare(`
    SELECT * FROM teaser_posts
    WHERE project_id = ?
    ORDER BY posted_at DESC
  `)
    .bind(projectId)
    .all();

  const requirementMet = teasers.results.length >= 2;

  // Get project release date for optimal window calculation
  const project = await db.prepare(`
    SELECT release_date FROM projects WHERE id = ?
  `)
    .bind(projectId)
    .first();

  let optimal_window = null;
  if (project) {
    const releaseDate = new Date(project.release_date as string);
    const optimalStart = new Date(releaseDate);
    optimalStart.setDate(optimalStart.getDate() - 28);
    const optimalEnd = new Date(releaseDate);
    optimalEnd.setDate(optimalEnd.getDate() - 21);

    optimal_window = {
      start: optimalStart.toISOString().split('T')[0],
      end: optimalEnd.toISOString().split('T')[0],
    };
  }

  return {
    teasers: teasers.results as TeaserPost[],
    count: teasers.results.length,
    requirement: {
      required: 2,
      actual: teasers.results.length,
      met: requirementMet,
    },
    optimal_posting_window: optimal_window,
  };
}
