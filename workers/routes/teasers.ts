/**
 * Teaser Posts API Routes
 *
 * NOTE: UI refers to this feature as "Social" (route: /project/:id/social)
 * but internal implementation uses "teasers" for historical reasons.
 * API endpoints at /api/teasers remain unchanged for backward compatibility.
 * Database table: teaser_posts
 */
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Supported platforms
const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Twitter', 'Facebook'] as const;
type Platform = typeof PLATFORMS[number];

/**
 * POST /api/teasers
 * Record a new teaser post
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      project_id,
      platform,
      post_url,
      snippet_duration,
      song_section,
      presave_link_included,
      source_content_id,
      user_uuid,
    } = body;

    // Validate required fields
    if (!project_id || !platform || !post_url || !snippet_duration || !song_section || !user_uuid) {
      return c.json(
        {
          error: 'Missing required fields',
          required: ['project_id', 'platform', 'post_url', 'snippet_duration', 'song_section', 'user_uuid'],
        },
        400
      );
    }

    // Validate platform
    if (!PLATFORMS.includes(platform as Platform)) {
      return c.json({ error: `Invalid platform. Must be one of: ${PLATFORMS.join(', ')}` }, 400);
    }

    // Validate post URL format
    if (!post_url.startsWith('http://') && !post_url.startsWith('https://')) {
      return c.json({ error: 'Post URL must be a valid HTTP/HTTPS URL' }, 400);
    }

    // Validate snippet duration (reasonable range: 5-60 seconds)
    if (snippet_duration < 5 || snippet_duration > 60) {
      return c.json({ error: 'Snippet duration must be between 5 and 60 seconds' }, 400);
    }

    // Get project release date to validate posting window
    const project = await c.env.DB.prepare(`
      SELECT release_date FROM projects WHERE id = ?
    `)
      .bind(project_id)
      .first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const releaseDate = new Date(project.release_date as string);
    const now = new Date();
    const daysUntilRelease = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Warn if posting outside optimal window (21-28 days before release)
    let posting_window_warning = null;
    if (daysUntilRelease < 21) {
      posting_window_warning = 'Posting less than 21 days before release - may reduce impact';
    } else if (daysUntilRelease > 28) {
      posting_window_warning = 'Posting more than 28 days before release - consider waiting for optimal window';
    }

    // Verify source content if provided
    if (source_content_id) {
      const contentExists = await c.env.DB.prepare(`
        SELECT id FROM content_items WHERE id = ? AND project_id = ?
      `)
        .bind(source_content_id, project_id)
        .first();

      if (!contentExists) {
        return c.json({ error: 'Invalid source_content_id' }, 400);
      }
    }

    // Insert teaser post
    const teaserId = crypto.randomUUID();
    const postedAt = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO teaser_posts (
        id, project_id, platform, post_url, snippet_duration, song_section,
        posted_at, presave_link_included, source_content_id, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        teaserId,
        project_id,
        platform,
        post_url,
        snippet_duration,
        song_section,
        postedAt,
        presave_link_included ? 1 : 0,
        source_content_id || null,
        user_uuid
      )
      .run();

    // Check if requirement is met (2 teasers)
    const teaserCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM teaser_posts WHERE project_id = ?
    `)
      .bind(project_id)
      .first();

    const requirementMet = (teaserCount?.count as number) >= 2;

    return c.json(
      {
        success: true,
        teaser: {
          id: teaserId,
          project_id,
          platform,
          post_url,
          snippet_duration,
          song_section,
          posted_at: postedAt,
          presave_link_included: presave_link_included ? 1 : 0,
        },
        requirement_status: {
          total_teasers: teaserCount?.count || 0,
          required: 2,
          met: requirementMet,
        },
        posting_window_warning,
      },
      201
    );
  } catch (error) {
    console.error('Error creating teaser:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/projects/:projectId/teasers
 * Get all teasers for a project
 */
app.get('/projects/:projectId/teasers', async (c) => {
  try {
    const { projectId } = c.req.param();

    const teasers = await c.env.DB.prepare(`
      SELECT * FROM teaser_posts
      WHERE project_id = ?
      ORDER BY posted_at DESC
    `)
      .bind(projectId)
      .all();

    const requirementMet = teasers.results.length >= 2;

    // Get project release date for optimal window calculation
    const project = await c.env.DB.prepare(`
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

    return c.json({
      teasers: teasers.results,
      count: teasers.results.length,
      requirement: {
        required: 2,
        actual: teasers.results.length,
        met: requirementMet,
      },
      optimal_posting_window: optimal_window,
    });
  } catch (error) {
    console.error('Error fetching teasers:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /api/teasers/:id/engagement
 * Update engagement metrics for a teaser
 */
app.patch('/:id/engagement', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { views, likes, shares, comments } = body;

    // Verify teaser exists
    const teaser = await c.env.DB.prepare(`
      SELECT id FROM teaser_posts WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!teaser) {
      return c.json({ error: 'Teaser not found' }, 404);
    }

    // Build engagement metrics JSON
    const engagementMetrics = JSON.stringify({
      views: views || 0,
      likes: likes || 0,
      shares: shares || 0,
      comments: comments || 0,
      last_updated: new Date().toISOString(),
    });

    // Update engagement metrics
    await c.env.DB.prepare(`
      UPDATE teaser_posts
      SET engagement_metrics = ?
      WHERE id = ?
    `)
      .bind(engagementMetrics, id)
      .run();

    return c.json({
      success: true,
      engagement_metrics: {
        views,
        likes,
        shares,
        comments,
      },
    });
  } catch (error) {
    console.error('Error updating engagement:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
