import { Hono } from 'hono';
import {
  validateFileSize,
  validateFileMimeType,
  type ContentType,
  CONTENT_TYPES,
  CAPTURE_CONTEXTS,
  type CaptureContext,
} from '../utils/fileValidation';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/content/upload
 * Upload content file to R2 and create database record
 */
app.post('/content/upload', async (c) => {
  try {
    const body = await c.req.parseBody();

    // Extract form fields
    const file = body.file as File;
    const projectId = body.project_id as string;
    const milestoneId = body.milestone_id as string | undefined;
    const contentType = body.content_type as ContentType;
    const captureContext = body.capture_context as CaptureContext;
    const captionDraft = body.caption_draft as string | undefined;
    const intendedPlatforms = body.intended_platforms as string | undefined;
    const userUuid = body.user_uuid as string;

    // Validate required fields
    if (!file || !projectId || !contentType || !captureContext || !userUuid) {
      return c.json(
        {
          error: 'Missing required fields',
          required: ['file', 'project_id', 'content_type', 'capture_context', 'user_uuid'],
        },
        400
      );
    }

    // Validate content type
    if (!CONTENT_TYPES.includes(contentType)) {
      return c.json({ error: `Invalid content_type. Must be one of: ${CONTENT_TYPES.join(', ')}` }, 400);
    }

    // Validate capture context
    if (!CAPTURE_CONTEXTS.includes(captureContext)) {
      return c.json({ error: `Invalid capture_context. Must be one of: ${CAPTURE_CONTEXTS.join(', ')}` }, 400);
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size, contentType);
    if (!sizeValidation.valid) {
      return c.json({ error: sizeValidation.error }, 413);
    }

    // Validate MIME type
    const mimeValidation = validateFileMimeType(file.type, contentType);
    if (!mimeValidation.valid) {
      return c.json({ error: mimeValidation.error }, 415);
    }

    // Generate storage key
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'bin';
    const storageKey = `${projectId}/content/${contentType}/${timestamp}-${crypto.randomUUID()}.${fileExtension}`;

    // Upload to R2
    await c.env.BUCKET.put(storageKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Insert content record
    const contentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO content_items (
        id, project_id, milestone_id, content_type, capture_context, storage_key,
        caption_draft, intended_platforms, created_at, uploaded_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      contentId,
      projectId,
      milestoneId || null,
      contentType,
      captureContext,
      storageKey,
      captionDraft || null,
      intendedPlatforms || null,
      createdAt,
      userUuid
    ).run();

    // Get quota status if milestone_id provided
    let quotaStatus = null;
    if (milestoneId) {
      quotaStatus = await getQuotaStatus(c.env.DB, milestoneId);
    }

    return c.json({
      success: true,
      content: {
        id: contentId,
        storage_key: storageKey,
        content_type: contentType,
        capture_context: captureContext,
      },
      quota_status: quotaStatus,
    }, 201);
  } catch (error) {
    console.error('Error uploading content:', error);
    return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/**
 * GET /api/projects/:projectId/content
 * Get all content for a project
 */
app.get('/projects/:projectId/content', async (c) => {
  try {
    const { projectId } = c.req.param();

    const milestoneId = c.req.query('milestone_id');
    const contentType = c.req.query('content_type');

    let query = 'SELECT * FROM content_items WHERE project_id = ?';
    const params: string[] = [projectId];

    if (milestoneId) {
      query += ' AND milestone_id = ?';
      params.push(milestoneId);
    }

    if (contentType) {
      query += ' AND content_type = ?';
      params.push(contentType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      content_items: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/milestones/:milestoneId/content-status
 * Get content quota status for a milestone
 */
app.get('/milestones/:milestoneId/content-status', async (c) => {
  try {
    const { milestoneId } = c.req.param();

    const quotaStatus = await getQuotaStatus(c.env.DB, milestoneId);

    return c.json(quotaStatus);
  } catch (error) {
    console.error('Error fetching content status:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/content/:contentId/url
 * Generate presigned URL for content preview
 */
app.get('/content/:contentId/url', async (c) => {
  try {
    const { contentId } = c.req.param();

    // Get content metadata
    const content = await c.env.DB.prepare(`
      SELECT storage_key FROM content_items WHERE id = ?
    `).bind(contentId).first();

    if (!content || !content.storage_key) {
      return c.json({ error: 'Content not found' }, 404);
    }

    // Generate presigned URL using existing utility
    const { generateDownloadUrl } = await import('../utils/r2SignedUrls');

    const url = await generateDownloadUrl(
      content.storage_key as string,
      'music-release-files', // Bucket name
      c.env.R2_ACCOUNT_ID,
      c.env.R2_ACCESS_KEY_ID,
      c.env.R2_SECRET_ACCESS_KEY
    );

    return c.json({ url });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/**
 * PATCH /api/content/:id
 * Update content item (primarily for milestone reassignment)
 */
app.patch('/content/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    // Validate content exists
    const existingContent = await c.env.DB.prepare(`
      SELECT id, project_id, milestone_id FROM content_items WHERE id = ?
    `).bind(id).first();

    if (!existingContent) {
      return c.json({ error: 'Content not found' }, 404);
    }

    // Validate milestone_id if provided
    if (body.milestone_id !== undefined && body.milestone_id !== null) {
      const milestone = await c.env.DB.prepare(`
        SELECT id, project_id FROM milestones WHERE id = ?
      `).bind(body.milestone_id).first();

      if (!milestone) {
        return c.json({ error: 'Milestone not found' }, 404);
      }

      // Ensure milestone belongs to same project
      if (milestone.project_id !== existingContent.project_id) {
        return c.json({ error: 'Milestone does not belong to the same project' }, 400);
      }
    }

    // Update milestone_id
    await c.env.DB.prepare(`
      UPDATE content_items SET milestone_id = ? WHERE id = ?
    `).bind(body.milestone_id || null, id).run();

    // Get updated quota status for the old milestone
    const oldQuotaStatus = existingContent.milestone_id
      ? await getQuotaStatus(c.env.DB, existingContent.milestone_id as string)
      : null;

    // Get updated quota status for the new milestone
    const newQuotaStatus = body.milestone_id
      ? await getQuotaStatus(c.env.DB, body.milestone_id)
      : null;

    return c.json({
      success: true,
      content_id: id,
      old_milestone_quota: oldQuotaStatus,
      new_milestone_quota: newQuotaStatus,
    });
  } catch (error) {
    console.error('Error updating content:', error);
    return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/**
 * Helper function to get quota status for a milestone
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
