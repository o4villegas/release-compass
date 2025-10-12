import { Hono } from "hono";
import { getProjectActions } from "../api-handlers/actions";

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/projects/:projectId/actions
 * Get all action items requiring attention for a project
 */
app.get('/projects/:projectId/actions', async (c) => {
  const { projectId } = c.req.param();

  try {
    const data = await getProjectActions(c.env.DB, projectId);
    return c.json(data);
  } catch (error) {
    console.error('Error fetching actions:', error);
    return c.json({ error: 'Failed to fetch actions' }, 500);
  }
});

export default app;
