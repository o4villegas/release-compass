// Extracted business logic for budget operations

// Budget categories and recommended allocations
const BUDGET_CATEGORIES = ['production', 'marketing', 'distribution', 'admin', 'contingency', 'content_creation'] as const;
type BudgetCategory = typeof BUDGET_CATEGORIES[number];

const RECOMMENDED_ALLOCATIONS: Record<BudgetCategory, number> = {
  production: 0.35,      // 35%
  marketing: 0.30,       // 30%
  content_creation: 0.10, // 10%
  distribution: 0.10,    // 10%
  admin: 0.10,          // 10%
  contingency: 0.05,    // 5%
};

/**
 * Get enhanced budget summary with allocations and percentages
 */
export async function getProjectBudget(db: D1Database, projectId: string) {
  // Get project to get total budget
  const project = await db.prepare(`
    SELECT total_budget FROM projects WHERE id = ?
  `).bind(projectId).first();

  if (!project) {
    return null; // Caller handles 404
  }

  const totalBudget = project.total_budget as number;

  // Get budget items by category
  const budgetSummary = await db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM budget_items
    WHERE project_id = ?
    GROUP BY category
  `).bind(projectId).all();

  // Calculate totals and percentages
  const categoryBreakdown: Record<string, any> = {};
  let totalSpent = 0;

  for (const cat of BUDGET_CATEGORIES) {
    categoryBreakdown[cat] = {
      spent: 0,
      count: 0,
      percentage: 0,
      recommended_amount: Math.round(totalBudget * RECOMMENDED_ALLOCATIONS[cat]),
      recommended_percentage: RECOMMENDED_ALLOCATIONS[cat] * 100,
      status: 'under', // under, on-track, warning, critical
    };
  }

  for (const row of budgetSummary.results) {
    const item = row as { category: string; total: number; count: number };
    const spent = item.total;
    totalSpent += spent;

    if (categoryBreakdown[item.category]) {
      categoryBreakdown[item.category].spent = spent;
      categoryBreakdown[item.category].count = item.count;
      categoryBreakdown[item.category].percentage = (spent / totalBudget) * 100;

      const recommendedAmount = categoryBreakdown[item.category].recommended_amount;
      const percentOfRecommended = (spent / recommendedAmount) * 100;

      if (percentOfRecommended > 130) {
        categoryBreakdown[item.category].status = 'critical';
      } else if (percentOfRecommended > 115) {
        categoryBreakdown[item.category].status = 'warning';
      } else if (percentOfRecommended >= 90) {
        categoryBreakdown[item.category].status = 'on-track';
      }
    }
  }

  return {
    total_budget: totalBudget,
    total_spent: totalSpent,
    remaining: totalBudget - totalSpent,
    percentage_spent: (totalSpent / totalBudget) * 100,
    by_category: categoryBreakdown,
    recommended_allocations: RECOMMENDED_ALLOCATIONS,
  };
}

/**
 * Check budget health and generate alerts
 */
export async function getBudgetAlerts(db: D1Database, projectId: string) {
  // Get project info
  const project = await db.prepare(`
    SELECT total_budget, release_date FROM projects WHERE id = ?
  `).bind(projectId).first();

  if (!project) {
    return null; // Caller handles 404
  }

  const totalBudget = project.total_budget as number;
  const releaseDate = new Date(project.release_date as string);
  const now = new Date();
  const daysUntilRelease = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Get budget breakdown
  const budgetSummary = await db.prepare(`
    SELECT category, SUM(amount) as total
    FROM budget_items
    WHERE project_id = ?
    GROUP BY category
  `).bind(projectId).all();

  const alerts: Array<{
    type: string;
    severity: 'warning' | 'critical';
    category?: string;
    message: string;
    details: any;
  }> = [];

  // Check each category against allocations
  for (const row of budgetSummary.results) {
    const item = row as { category: BudgetCategory; total: number };
    const recommendedAmount = totalBudget * RECOMMENDED_ALLOCATIONS[item.category];
    const percentOfRecommended = (item.total / recommendedAmount) * 100;

    if (percentOfRecommended > 130) {
      alerts.push({
        type: 'budget_overage',
        severity: 'critical',
        category: item.category,
        message: `${item.category} spending at ${percentOfRecommended.toFixed(0)}% of recommended allocation`,
        details: {
          spent: item.total,
          recommended: recommendedAmount,
          overage: item.total - recommendedAmount,
        },
      });
    } else if (percentOfRecommended > 115) {
      alerts.push({
        type: 'budget_overage',
        severity: 'warning',
        category: item.category,
        message: `${item.category} spending at ${percentOfRecommended.toFixed(0)}% of recommended allocation`,
        details: {
          spent: item.total,
          recommended: recommendedAmount,
          overage: item.total - recommendedAmount,
        },
      });
    }
  }

  // Check marketing underspend with approaching release
  const marketingSpent =
    (budgetSummary.results.find((r: any) => r.category === 'marketing') as any)?.total || 0;
  const marketingPercentage = (marketingSpent / totalBudget) * 100;

  if (daysUntilRelease <= 30 && marketingPercentage < 25) {
    alerts.push({
      type: 'marketing_underspend',
      severity: 'critical',
      category: 'marketing',
      message: `Marketing spend only ${marketingPercentage.toFixed(0)}% with ${daysUntilRelease} days until release`,
      details: {
        spent: marketingSpent,
        percentage: marketingPercentage,
        days_until_release: daysUntilRelease,
        recommended_minimum: totalBudget * 0.25,
      },
    });
  }

  return {
    alerts,
    alert_count: alerts.length,
    has_critical: alerts.some((a) => a.severity === 'critical'),
    has_warnings: alerts.some((a) => a.severity === 'warning'),
  };
}
