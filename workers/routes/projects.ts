import { Hono } from 'hono';
import { generateMilestonesForProject } from '../utils/milestoneTemplates';
import { checkClearedForRelease } from '../utils/clearedForRelease';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/projects
 * Create a new project with auto-generated milestones
 */
app.post('/projects', async (c) => {
  try {
    const body = await c.req.json();
    const { artist_name, release_title, release_date, release_type, total_budget, user_uuid } = body;

    // Validate required fields
    if (!artist_name || !release_title || !release_date || !release_type || !total_budget || !user_uuid) {
      return c.json(
        { error: 'Missing required fields', required: ['artist_name', 'release_title', 'release_date', 'release_type', 'total_budget', 'user_uuid'] },
        400
      );
    }

    // Validate release_type
    if (!['single', 'EP', 'album'].includes(release_type)) {
      return c.json({ error: 'Invalid release_type. Must be: single, EP, or album' }, 400);
    }

    // Validate release_date is in the future
    const releaseDate = new Date(release_date);
    const now = new Date();
    if (releaseDate <= now) {
      return c.json({ error: 'Release date must be in the future' }, 400);
    }

    // Validate budget is positive
    if (total_budget <= 0) {
      return c.json({ error: 'Total budget must be greater than 0' }, 400);
    }

    // Generate project ID
    const projectId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Insert project
    await c.env.DB.prepare(`
      INSERT INTO projects (id, artist_name, release_title, release_date, release_type, total_budget, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      projectId,
      artist_name,
      release_title,
      release_date,
      release_type,
      total_budget,
      createdAt,
      user_uuid
    ).run();

    // Generate milestones from templates
    const milestonesToCreate = generateMilestonesForProject(projectId, release_date);

    // Insert milestones
    for (const milestone of milestonesToCreate) {
      await c.env.DB.prepare(`
        INSERT INTO milestones (id, project_id, name, description, due_date, status, blocks_release, proof_required, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        milestone.id,
        milestone.project_id,
        milestone.name,
        milestone.description,
        milestone.due_date,
        milestone.status,
        milestone.blocks_release,
        milestone.proof_required,
        milestone.created_at
      ).run();

      // Insert content requirements for this milestone
      for (const req of milestone.content_requirements) {
        await c.env.DB.prepare(`
          INSERT INTO milestone_content_requirements (id, milestone_id, content_type, minimum_count)
          VALUES (?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          milestone.id,
          req.type,
          req.count
        ).run();
      }
    }

    // Fetch created project
    const project = await c.env.DB.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).bind(projectId).first();

    // Fetch created milestones
    const milestones = await c.env.DB.prepare(`
      SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC
    `).bind(projectId).all();

    return c.json({
      project,
      milestones: milestones.results
    }, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/**
 * GET /api/projects/:id
 * Get project details with milestones
 */
app.get('/projects/:id', async (c) => {
  try {
    const { id } = c.req.param();

    // Fetch project
    const project = await c.env.DB.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).bind(id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Fetch milestones
    const milestones = await c.env.DB.prepare(`
      SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC
    `).bind(id).all();

    // Fetch budget summary
    const budgetSummary = await c.env.DB.prepare(`
      SELECT category, SUM(amount) as total
      FROM budget_items
      WHERE project_id = ?
      GROUP BY category
    `).bind(id).all();

    const budgetByCategory: Record<string, number> = {};
    let totalSpent = 0;
    for (const row of budgetSummary.results) {
      const item = row as { category: string; total: number };
      budgetByCategory[item.category] = item.total;
      totalSpent += item.total;
    }

    // Check cleared-for-release status
    const clearedForRelease = await checkClearedForRelease(c.env.DB, id);

    return c.json({
      project,
      milestones: milestones.results,
      budget_summary: {
        total_spent: totalSpent,
        by_category: budgetByCategory
      },
      cleared_for_release: clearedForRelease
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/projects/:id/cleared-for-release
 * Check if project is cleared for release
 */
app.get('/projects/:id/cleared-for-release', async (c) => {
  try {
    const { id } = c.req.param();

    // Verify project exists
    const project = await c.env.DB.prepare(`
      SELECT id FROM projects WHERE id = ?
    `).bind(id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Check cleared-for-release status
    const result = await checkClearedForRelease(c.env.DB, id);

    return c.json(result);
  } catch (error) {
    console.error('Error checking cleared-for-release:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
