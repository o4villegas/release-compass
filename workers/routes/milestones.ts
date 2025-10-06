import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/milestones/:id/complete
 * Mark a milestone as complete (with quota validation)
 * CRITICAL: This is the breakthrough feature - enforces content capture before completion
 */
app.post('/milestones/:id/complete', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const userUuid = body.user_uuid as string;

    if (!userUuid) {
      return c.json({ error: 'user_uuid is required' }, 400);
    }

    // Check if milestone exists
    const milestone = await c.env.DB.prepare(`
      SELECT id, project_id, status, title
      FROM milestones
      WHERE id = ?
    `).bind(id).first();

    if (!milestone) {
      return c.json({ error: 'Milestone not found' }, 404);
    }

    if (milestone.status === 'complete') {
      return c.json({ error: 'Milestone is already complete' }, 400);
    }

    // CRITICAL: Check content quota before allowing completion
    const quotaStatus = await getQuotaStatus(c.env.DB, id);

    if (!quotaStatus.quota_met) {
      return c.json({
        error: 'QUOTA_NOT_MET',
        message: 'Cannot complete milestone: content requirements not met',
        quota_status: quotaStatus,
      }, 400);
    }

    // Quota is met - allow completion
    const completedAt = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE milestones
      SET status = 'complete', completed_at = ?
      WHERE id = ?
    `).bind(completedAt, id).run();

    // Get updated milestone
    const updatedMilestone = await c.env.DB.prepare(`
      SELECT * FROM milestones WHERE id = ?
    `).bind(id).first();

    return c.json({
      success: true,
      milestone: updatedMilestone,
      quota_status: quotaStatus,
      message: 'Milestone completed successfully',
    });
  } catch (error) {
    console.error('Error completing milestone:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/milestones/:id
 * Get milestone details with content requirements
 */
app.get('/milestones/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const milestone = await c.env.DB.prepare(`
      SELECT * FROM milestones WHERE id = ?
    `).bind(id).first();

    if (!milestone) {
      return c.json({ error: 'Milestone not found' }, 404);
    }

    // Get content requirements
    const requirements = await c.env.DB.prepare(`
      SELECT content_type, minimum_count
      FROM milestone_content_requirements
      WHERE milestone_id = ?
    `).bind(id).all();

    // Get quota status
    const quotaStatus = await getQuotaStatus(c.env.DB, id);

    return c.json({
      milestone,
      content_requirements: requirements.results,
      quota_status: quotaStatus,
    });
  } catch (error) {
    console.error('Error fetching milestone:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Helper function to get quota status for a milestone
 * (Shared with content.ts - could be extracted to a utility file)
 */
async function getQuotaStatus(db: D1Database, milestoneId: string) {
  // Get requirements
  const requirements = await db.prepare(`
    SELECT content_type, minimum_count
    FROM milestone_content_requirements
    WHERE milestone_id = ?
  `).bind(milestoneId).all();

  if (requirements.results.length === 0) {
    return {
      quota_met: true,
      requirements: [],
      message: 'No content requirements for this milestone',
    };
  }

  // Get actual counts
  const details = [];
  let allMet = true;

  for (const req of requirements.results) {
    const row = req as { content_type: string; minimum_count: number };

    const countResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM content_items
      WHERE milestone_id = ? AND content_type = ?
    `).bind(milestoneId, row.content_type).first();

    const actual = (countResult?.count as number) || 0;
    const required = row.minimum_count;
    const missing = Math.max(0, required - actual);

    if (actual < required) {
      allMet = false;
    }

    details.push({
      content_type: row.content_type,
      required,
      actual,
      missing,
      met: actual >= required,
    });
  }

  return {
    quota_met: allMet,
    requirements: details,
    message: allMet ? 'All content requirements met' : 'Content quota not met',
  };
}

export default app;
