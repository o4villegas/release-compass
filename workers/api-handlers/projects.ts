// Extracted business logic for projects
import { checkClearedForRelease } from '../utils/clearedForRelease';

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
    milestones: milestones.results,
    budget_summary: {
      total_spent: totalSpent,
      by_category: budgetByCategory
    },
    cleared_for_release: clearedForRelease
  };
}
