/**
 * Content Calendar API Handler
 */

export async function getContentSchedule(db: D1Database, projectId: string) {
  // Get all scheduled content for this project
  const scheduled = await db.prepare(`
    SELECT
      cs.*,
      ci.content_type,
      ci.caption_draft,
      ci.storage_key,
      ci.intended_platforms
    FROM content_schedule cs
    LEFT JOIN content_items ci ON cs.content_id = ci.id
    WHERE ci.project_id = ?
    ORDER BY cs.scheduled_date ASC
  `).bind(projectId).all();

  return {
    scheduled_content: scheduled.results.map(row => ({
      id: row.id,
      content_id: row.content_id,
      scheduled_date: row.scheduled_date,
      scheduled_platforms: row.scheduled_platforms,
      scheduling_notes: row.scheduling_notes,
      content: {
        id: row.content_id,
        content_type: row.content_type,
        caption_draft: row.caption_draft,
        storage_key: row.storage_key,
        intended_platforms: row.intended_platforms
      }
    }))
  };
}

export async function createContentSchedule(
  db: D1Database,
  contentId: string,
  scheduledDate: string,
  platforms: string | null,
  notes: string | null,
  userUuid: string
) {
  const scheduleId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.prepare(`
    INSERT INTO content_schedule (
      id, content_id, scheduled_date, scheduled_platforms,
      scheduling_notes, created_at, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    scheduleId,
    contentId,
    scheduledDate,
    platforms,
    notes,
    createdAt,
    userUuid
  ).run();

  return {
    id: scheduleId,
    content_id: contentId,
    scheduled_date: scheduledDate,
    scheduled_platforms: platforms,
    scheduling_notes: notes
  };
}

export async function updateContentSchedule(
  db: D1Database,
  scheduleId: string,
  scheduledDate: string,
  platforms: string | null,
  notes: string | null
) {
  const updatedAt = new Date().toISOString();

  await db.prepare(`
    UPDATE content_schedule
    SET scheduled_date = ?,
        scheduled_platforms = ?,
        scheduling_notes = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    scheduledDate,
    platforms,
    notes,
    updatedAt,
    scheduleId
  ).run();

  return {
    id: scheduleId,
    scheduled_date: scheduledDate,
    scheduled_platforms: platforms,
    scheduling_notes: notes
  };
}

export async function deleteContentSchedule(
  db: D1Database,
  scheduleId: string
) {
  await db.prepare(`
    DELETE FROM content_schedule WHERE id = ?
  `).bind(scheduleId).run();

  return { success: true };
}
