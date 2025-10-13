import { Hono } from 'hono';
import { generateDownloadUrl } from '../utils/r2SignedUrls';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// File type validation
// Note: 'artwork' removed - now stored in projects table, not files table
const FILE_TYPES = ['master', 'stems', 'contracts', 'receipts'] as const;
type FileType = typeof FILE_TYPES[number];

const FILE_SIZE_LIMITS: Record<FileType, number> = {
  master: 100 * 1024 * 1024, // 100MB
  stems: 100 * 1024 * 1024, // 100MB
  contracts: 10 * 1024 * 1024, // 10MB
  receipts: 10 * 1024 * 1024, // 10MB
};

/**
 * POST /api/files/upload
 * Upload master audio, stems, contracts, receipts to R2
 * Note: Album artwork now uploaded during project creation, not here
 */
app.post('/files/upload', async (c) => {
  try {
    const body = await c.req.parseBody();

    const file = body.file as File;
    const projectId = body.project_id as string;
    const fileType = body.file_type as FileType;
    const userUuid = body.user_uuid as string;

    // Validate required fields
    if (!file || !projectId || !fileType || !userUuid) {
      return c.json(
        {
          error: 'Missing required fields',
          required: ['file', 'project_id', 'file_type', 'user_uuid'],
        },
        400
      );
    }

    // Validate file type
    if (!FILE_TYPES.includes(fileType)) {
      return c.json(
        { error: `Invalid file_type. Must be one of: ${FILE_TYPES.join(', ')}` },
        400
      );
    }

    // Validate file size
    const sizeLimit = FILE_SIZE_LIMITS[fileType];
    if (file.size > sizeLimit) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const limitMB = (sizeLimit / 1024 / 1024).toFixed(0);
      return c.json(
        {
          error: `File size ${sizeMB}MB exceeds limit of ${limitMB}MB. Please compress before uploading.`,
        },
        413
      );
    }

    // Generate storage key
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'bin';
    const storageKey = `${projectId}/files/${fileType}/${timestamp}-${crypto.randomUUID()}.${fileExtension}`;

    // Upload to R2
    await c.env.BUCKET.put(storageKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Insert file record
    const fileId = crypto.randomUUID();
    const uploadedAt = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO files (
        id, project_id, file_type, storage_key, uploaded_at, uploaded_by
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(fileId, projectId, fileType, storageKey, uploadedAt, userUuid)
      .run();

    return c.json(
      {
        success: true,
        file: {
          id: fileId,
          storage_key: storageKey,
          file_type: fileType,
          uploaded_at: uploadedAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return c.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/files/:id
 * Get file details with presigned download URL
 */
app.get('/files/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const file = await c.env.DB.prepare(`
      SELECT * FROM files WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Generate presigned download URL
    const downloadUrl = await generateDownloadUrl(
      file.storage_key as string,
      'music-release-files',
      c.env.R2_ACCOUNT_ID,
      c.env.R2_ACCESS_KEY_ID,
      c.env.R2_SECRET_ACCESS_KEY
    );

    return c.json({
      file,
      download_url: downloadUrl,
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/files/:fileId/notes
 * Add timestamp note to a file
 */
app.post('/files/:fileId/notes', async (c) => {
  try {
    const { fileId } = c.req.param();
    const body = await c.req.json();
    const { timestamp_seconds, note_text, user_uuid } = body;

    if (timestamp_seconds === undefined || !note_text || !user_uuid) {
      return c.json(
        {
          error: 'Missing required fields',
          required: ['timestamp_seconds', 'note_text', 'user_uuid'],
        },
        400
      );
    }

    // Verify file exists
    const file = await c.env.DB.prepare(`
      SELECT id FROM files WHERE id = ?
    `)
      .bind(fileId)
      .first();

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Insert note
    const noteId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO file_notes (id, file_id, timestamp_seconds, note_text, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(noteId, fileId, timestamp_seconds, note_text, user_uuid, createdAt)
      .run();

    return c.json(
      {
        success: true,
        note: {
          id: noteId,
          file_id: fileId,
          timestamp_seconds,
          note_text,
          created_by: user_uuid,
          created_at: createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error adding note:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/files/:fileId/notes
 * Get all notes for a file, ordered by timestamp
 */
app.get('/files/:fileId/notes', async (c) => {
  try {
    const { fileId } = c.req.param();

    const notes = await c.env.DB.prepare(`
      SELECT * FROM file_notes
      WHERE file_id = ?
      ORDER BY timestamp_seconds ASC
    `)
      .bind(fileId)
      .all();

    return c.json({
      notes: notes.results,
      count: notes.results.length,
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/files/:fileId/acknowledge-notes
 * Mark all notes as acknowledged by the file uploader
 */
app.post('/files/:fileId/acknowledge-notes', async (c) => {
  try {
    const { fileId } = c.req.param();
    const body = await c.req.json();
    const { user_uuid } = body;

    if (!user_uuid) {
      return c.json({ error: 'user_uuid is required' }, 400);
    }

    // Verify file exists and check uploader
    const file = await c.env.DB.prepare(`
      SELECT id, uploaded_by, notes_acknowledged FROM files WHERE id = ?
    `)
      .bind(fileId)
      .first();

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Only the uploader can acknowledge notes
    if (file.uploaded_by !== user_uuid) {
      return c.json(
        { error: 'Only the file uploader can acknowledge notes' },
        403
      );
    }

    if (file.notes_acknowledged === 1) {
      return c.json({ error: 'Notes already acknowledged' }, 400);
    }

    // Mark notes as acknowledged
    const acknowledgedAt = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE files
      SET notes_acknowledged = 1,
          notes_acknowledged_at = ?,
          notes_acknowledged_by = ?
      WHERE id = ?
    `)
      .bind(acknowledgedAt, user_uuid, fileId)
      .run();

    return c.json({
      success: true,
      message: 'Notes acknowledged successfully',
      acknowledged_at: acknowledgedAt,
    });
  } catch (error) {
    console.error('Error acknowledging notes:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/files/:fileId/metadata
 * Add metadata (ISRC, genre, explicit_content) to a master file
 */
app.post('/files/:fileId/metadata', async (c) => {
  try {
    const { fileId } = c.req.param();
    const body = await c.req.json();
    const { isrc, genre, explicit_content, user_uuid } = body;

    // Validate required fields
    if (!isrc || !genre || typeof explicit_content !== 'boolean' || !user_uuid) {
      return c.json(
        {
          error: 'Missing required fields',
          required: ['isrc', 'genre', 'explicit_content', 'user_uuid'],
        },
        400
      );
    }

    // Validate ISRC format (CC-XXX-YY-NNNNN)
    const isrcRegex = /^[A-Z]{2}-[A-Z0-9]{3}-\d{2}-\d{5}$/;
    if (!isrcRegex.test(isrc)) {
      return c.json(
        { error: 'Invalid ISRC format. Must be: CC-XXX-YY-NNNNN (e.g., US-S1Z-99-00001)' },
        400
      );
    }

    // Validate genre
    const validGenres = [
      'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Country', 'Electronic', 'Jazz', 'Classical',
      'Metal', 'Indie', 'Alternative', 'Folk', 'Blues', 'Reggae', 'Latin', 'K-Pop',
      'World', 'Soundtrack', 'Other',
    ];
    if (!validGenres.includes(genre)) {
      return c.json(
        { error: `Invalid genre. Must be one of: ${validGenres.join(', ')}` },
        400
      );
    }

    // Verify file exists and is a master file
    const file = await c.env.DB.prepare(`
      SELECT id, file_type, uploaded_by FROM files WHERE id = ?
    `)
      .bind(fileId)
      .first();

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    if (file.file_type !== 'master') {
      return c.json({ error: 'Metadata can only be added to master files' }, 400);
    }

    // Store metadata as JSON
    const metadata = {
      isrc,
      genre,
      explicit_content,
    };

    const metadataJson = JSON.stringify(metadata);
    const completedAt = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE files
      SET metadata_json = ?,
          metadata_complete = 1,
          metadata_completed_at = ?
      WHERE id = ?
    `)
      .bind(metadataJson, completedAt, fileId)
      .run();

    return c.json({
      success: true,
      message: 'Metadata saved successfully',
      metadata: {
        isrc,
        genre,
        explicit_content,
      },
    });
  } catch (error) {
    console.error('Error saving metadata:', error);
    return c.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /api/projects/:projectId/files
 * Get all files for a project
 */
app.get('/projects/:projectId/files', async (c) => {
  try {
    const { projectId } = c.req.param();
    const fileType = c.req.query('file_type');

    let query = 'SELECT * FROM files WHERE project_id = ?';
    const params: string[] = [projectId];

    if (fileType) {
      query += ' AND file_type = ?';
      params.push(fileType);
    }

    query += ' ORDER BY uploaded_at DESC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      files: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
