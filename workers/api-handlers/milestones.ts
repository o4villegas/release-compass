// Extracted business logic for milestones

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

/**
 * Get milestone details with content requirements and quota status
 */
export async function getMilestoneDetails(db: D1Database, milestoneId: string) {
  const milestone = await db.prepare(`
    SELECT * FROM milestones WHERE id = ?
  `).bind(milestoneId).first();

  if (!milestone) {
    return null; // Caller handles 404
  }

  // Get content requirements
  const requirements = await db.prepare(`
    SELECT content_type, minimum_count
    FROM milestone_content_requirements
    WHERE milestone_id = ?
  `).bind(milestoneId).all();

  // Get quota status
  const quotaStatus = await getQuotaStatus(db, milestoneId);

  return {
    milestone,
    content_requirements: requirements.results,
    quota_status: quotaStatus,
  };
}
