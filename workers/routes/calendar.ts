/**
 * Content Calendar API Routes
 */
import { Hono } from 'hono';
import {
  getContentSchedule,
  createContentSchedule,
  updateContentSchedule,
  deleteContentSchedule
} from '../api-handlers/calendar';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

/**
 * GET /api/projects/:projectId/calendar
 * Get all scheduled content for a project
 */
app.get('/projects/:projectId/calendar', async (c) => {
  try {
    const { projectId } = c.req.param();
    const result = await getContentSchedule(c.env.DB, projectId);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching content schedule:', error);
    return c.json({ error: 'Failed to fetch content schedule' }, 500);
  }
});

/**
 * POST /api/calendar/schedule
 * Create a new scheduled content item
 *
 * Body: {
 *   contentId: string,
 *   scheduledDate: string,
 *   platforms: string | null,
 *   notes: string | null,
 *   userUuid: string
 * }
 */
app.post('/calendar/schedule', async (c) => {
  try {
    const body = await c.req.json();
    const { contentId, scheduledDate, platforms, notes, userUuid } = body;

    if (!contentId || !scheduledDate || !userUuid) {
      return c.json({ error: 'Missing required fields: contentId, scheduledDate, userUuid' }, 400);
    }

    const result = await createContentSchedule(
      c.env.DB,
      contentId,
      scheduledDate,
      platforms || null,
      notes || null,
      userUuid
    );

    return c.json(result, 201);
  } catch (error) {
    console.error('Error creating schedule:', error);
    return c.json({ error: 'Failed to create schedule' }, 500);
  }
});

/**
 * PATCH /api/calendar/schedule/:id
 * Update an existing scheduled content item
 *
 * Body: {
 *   scheduledDate: string,
 *   platforms: string | null,
 *   notes: string | null
 * }
 */
app.patch('/calendar/schedule/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { scheduledDate, platforms, notes } = body;

    if (!scheduledDate) {
      return c.json({ error: 'Missing required field: scheduledDate' }, 400);
    }

    const result = await updateContentSchedule(
      c.env.DB,
      id,
      scheduledDate,
      platforms || null,
      notes || null
    );

    return c.json(result);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return c.json({ error: 'Failed to update schedule' }, 500);
  }
});

/**
 * DELETE /api/calendar/schedule/:id
 * Delete a scheduled content item
 */
app.delete('/calendar/schedule/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const result = await deleteContentSchedule(c.env.DB, id);
    return c.json(result);
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return c.json({ error: 'Failed to delete schedule' }, 500);
  }
});

export default app;
