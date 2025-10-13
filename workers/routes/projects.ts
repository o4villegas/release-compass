import { Hono } from 'hono';
import { generateMilestonesForProject } from '../utils/milestoneTemplates';
import { checkClearedForRelease } from '../utils/clearedForRelease';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/projects
 * Get all projects for a user with aggregated stats
 */
app.get('/projects', async (c) => {
  try {
    const userUuid = c.req.query('user_uuid');

    if (!userUuid) {
      return c.json({ error: 'user_uuid query parameter is required' }, 400);
    }

    // Use extracted handler function
    const { getAllProjects } = await import('../api-handlers/projects');
    const data = await getAllProjects(c.env.DB, userUuid, {
      accountId: c.env.R2_ACCOUNT_ID,
      accessKeyId: c.env.R2_ACCESS_KEY_ID,
      secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
    });

    return c.json(data.projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/projects
 * Create a new project with auto-generated milestones
 */
app.post('/projects', async (c) => {
  try {
    // Parse FormData (supports both artwork file upload and text fields)
    const body = await c.req.parseBody();
    const artist_name = body.artist_name as string;
    const release_title = body.release_title as string;
    const release_date = body.release_date as string;
    const release_type = body.release_type as string;
    const total_budget = parseFloat(body.total_budget as string);
    const user_uuid = body.user_uuid as string;
    const artwork = body.artwork as File | undefined;
    const artwork_width = body.artwork_width ? parseInt(body.artwork_width as string) : null;
    const artwork_height = body.artwork_height ? parseInt(body.artwork_height as string) : null;

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

    // Handle artwork upload if provided
    let artworkStorageKey: string | null = null;
    if (artwork) {
      // Validate artwork file size (10MB limit)
      if (artwork.size > 10 * 1024 * 1024) {
        return c.json({ error: 'Artwork file must be under 10MB' }, 413);
      }

      // Validate artwork file type
      if (!['image/jpeg', 'image/png'].includes(artwork.type)) {
        return c.json({ error: 'Artwork must be JPG or PNG' }, 415);
      }

      // Generate storage key
      const timestamp = Date.now();
      const fileExtension = artwork.name.split('.').pop() || 'jpg';
      artworkStorageKey = `${projectId}/artwork/${timestamp}-${crypto.randomUUID()}.${fileExtension}`;

      // Upload to R2
      await c.env.BUCKET.put(artworkStorageKey, artwork.stream(), {
        httpMetadata: {
          contentType: artwork.type,
        },
      });
    }

    // Insert project with artwork fields
    await c.env.DB.prepare(`
      INSERT INTO projects (id, artist_name, release_title, release_date, release_type, total_budget, artwork_storage_key, artwork_width, artwork_height, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      projectId,
      artist_name,
      release_title,
      release_date,
      release_type,
      total_budget,
      artworkStorageKey,
      artwork_width,
      artwork_height,
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

    // Use extracted handler function
    const { getProjectDetails } = await import('../api-handlers/projects');
    const data = await getProjectDetails(c.env.DB, id);

    if (!data) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(data);
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
