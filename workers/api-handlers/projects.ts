// Extracted business logic for projects
import { checkClearedForRelease } from '../utils/clearedForRelease';

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

export async function getProjectDetails(db: D1Database, projectId: string) {
  // Fetch project
  const project = await db.prepare(`
    SELECT * FROM projects WHERE id = ?
  `).bind(projectId).first();

  if (!project) {
    return null; // Caller handles 404
  }

  // Fetch milestones
  const milestones = await db.prepare(`
    SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC
  `).bind(projectId).all();

  // Fetch quota status for each milestone
  const milestonesWithQuota = await Promise.all(
    milestones.results.map(async (milestone) => {
      const milestoneId = (milestone as { id: string }).id;
      const quotaStatus = await getQuotaStatus(db, milestoneId);
      return {
        ...milestone,
        quota_status: quotaStatus,
      };
    })
  );

  // Fetch budget summary
  const budgetSummary = await db.prepare(`
    SELECT category, SUM(amount) as total
    FROM budget_items
    WHERE project_id = ?
    GROUP BY category
  `).bind(projectId).all();

  // Process budget data
  const budgetByCategory: Record<string, number> = {};
  let totalSpent = 0;
  for (const row of budgetSummary.results) {
    const item = row as { category: string; total: number };
    budgetByCategory[item.category] = item.total;
    totalSpent += item.total;
  }

  // Check cleared-for-release status
  const clearedForRelease = await checkClearedForRelease(db, projectId);

  // Return data (same structure as API)
  return {
    project,
    milestones: milestonesWithQuota,
    budget_summary: {
      total_spent: totalSpent,
      by_category: budgetByCategory
    },
    cleared_for_release: clearedForRelease
  };
}
