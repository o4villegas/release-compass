/**
 * API handler for aggregating action items across a project
 * Detects overdue milestones, content quotas, unacknowledged notes, budget warnings, etc.
 */

export interface ActionItem {
  id: string;
  type: 'content_quota' | 'notes_unacknowledged' | 'budget_warning' | 'milestone_overdue' | 'proof_required';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_url: string;
  action_label: string;
  dismissible: boolean;
  metadata: Record<string, any>;
}

/**
 * Get all action items requiring attention for a project
 */
export async function getProjectActions(
  db: D1Database,
  projectId: string
): Promise<{ actions: ActionItem[]; count: number }> {
  const actions: ActionItem[] = [];
  const now = new Date().toISOString();

  // 1. Check content quotas for incomplete milestones
  const incompleteMilestones = await db.prepare(`
    SELECT m.id, m.name, m.due_date, m.status
    FROM milestones m
    WHERE m.project_id = ? AND m.status != 'complete'
  `).bind(projectId).all();

  for (const milestone of incompleteMilestones.results) {
    // Get quota status for this milestone
    const requirements = await db.prepare(`
      SELECT content_type, minimum_count
      FROM milestone_content_requirements
      WHERE milestone_id = ?
    `).bind(milestone.id).all();

    if (requirements.results.length > 0) {
      // Check if quota is met
      const details = [];
      let allMet = true;

      for (const req of requirements.results) {
        const row = req as { content_type: string; minimum_count: number };

        const countResult = await db.prepare(`
          SELECT COUNT(*) as count
          FROM content_items
          WHERE milestone_id = ? AND content_type = ?
        `).bind(milestone.id, row.content_type).first();

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

      if (!allMet) {
        const daysUntilDue = Math.ceil(
          (new Date(milestone.due_date as string).getTime() - new Date(now).getTime())
          / (1000 * 60 * 60 * 24)
        );

        const unmetRequirements = details
          .filter(d => !d.met)
          .map(d => `${d.content_type.replace('_', ' ')}: ${d.missing} more`)
          .join(', ');

        actions.push({
          id: `quota-${milestone.id}`,
          type: 'content_quota',
          severity: daysUntilDue <= 3 ? 'high' : daysUntilDue <= 7 ? 'medium' : 'low',
          title: `Content Quota Not Met: ${milestone.name}`,
          description: `Still needed: ${unmetRequirements}`,
          action_url: `/project/${projectId}/content`,
          action_label: 'Upload Content',
          dismissible: true,
          metadata: {
            milestone_id: milestone.id,
            days_until_due: daysUntilDue,
            requirements: details,
          },
        });
      }
    }
  }

  // 2. Check unacknowledged notes
  const filesWithNotes = await db.prepare(`
    SELECT f.id, f.storage_key, f.uploaded_by, COUNT(fn.id) as note_count
    FROM files f
    JOIN file_notes fn ON fn.file_id = f.id
    WHERE f.project_id = ? AND f.notes_acknowledged = 0
    GROUP BY f.id
  `).bind(projectId).all();

  if (filesWithNotes.results.length > 0) {
    actions.push({
      id: 'notes-unacknowledged',
      type: 'notes_unacknowledged',
      severity: 'high',
      title: `${filesWithNotes.results.length} file(s) with unacknowledged notes`,
      description: 'Producer feedback requires acknowledgment before milestone completion',
      action_url: `/project/${projectId}/master`,
      action_label: 'Review Notes',
      dismissible: false, // Blocking action
      metadata: { file_count: filesWithNotes.results.length },
    });
  }

  // 3. Check budget warnings
  const project = await db.prepare(`
    SELECT total_budget FROM projects WHERE id = ?
  `).bind(projectId).first();

  if (project) {
    const totalBudget = project.total_budget as number;

    const budgetSummary = await db.prepare(`
      SELECT category, SUM(amount) as total
      FROM budget_items
      WHERE project_id = ?
      GROUP BY category
    `).bind(projectId).all();

    const RECOMMENDED_ALLOCATIONS: Record<string, number> = {
      production: 0.35,
      marketing: 0.30,
      content_creation: 0.10,
      distribution: 0.10,
      admin: 0.10,
      contingency: 0.05,
    };

    const criticalAlerts = [];
    for (const row of budgetSummary.results) {
      const item = row as { category: string; total: number };
      const recommendedAmount = totalBudget * (RECOMMENDED_ALLOCATIONS[item.category] || 0.10);
      const percentOfRecommended = (item.total / recommendedAmount) * 100;

      if (percentOfRecommended > 130) {
        criticalAlerts.push({
          category: item.category,
          message: `${item.category} at ${percentOfRecommended.toFixed(0)}% of recommended allocation`,
          spent: item.total,
          recommended: recommendedAmount,
        });
      }
    }

    if (criticalAlerts.length > 0) {
      actions.push({
        id: 'budget-critical',
        type: 'budget_warning',
        severity: 'high',
        title: `Budget overspend in ${criticalAlerts.length} categor${criticalAlerts.length === 1 ? 'y' : 'ies'}`,
        description: criticalAlerts[0].message,
        action_url: `/project/${projectId}/budget`,
        action_label: 'Review Budget',
        dismissible: true,
        metadata: { alerts: criticalAlerts },
      });
    }
  }

  // 4. Check overdue milestones
  const overdue = await db.prepare(`
    SELECT id, name, due_date, blocks_release
    FROM milestones
    WHERE project_id = ? AND status != 'complete' AND due_date < ?
    ORDER BY due_date ASC
  `).bind(projectId, now).all();

  for (const m of overdue.results) {
    const milestone = m as { id: string; name: string; due_date: string; blocks_release: number };
    const daysOverdue = Math.ceil(
      (new Date().getTime() - new Date(milestone.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    actions.push({
      id: `overdue-${milestone.id}`,
      type: 'milestone_overdue',
      severity: milestone.blocks_release ? 'high' : 'medium',
      title: `${milestone.name} is overdue`,
      description: `Due date was ${new Date(milestone.due_date).toLocaleDateString()} (${daysOverdue} days ago)`,
      action_url: `/milestone/${milestone.id}`,
      action_label: 'View Milestone',
      dismissible: false,
      metadata: {
        milestone_id: milestone.id,
        blocks_release: milestone.blocks_release,
        days_overdue: daysOverdue,
      },
    });
  }

  // 5. Check proof required for blocking milestones
  const proofRequired = await db.prepare(`
    SELECT id, name, due_date
    FROM milestones
    WHERE project_id = ? AND blocks_release = 1 AND proof_required = 1
      AND proof_file IS NULL AND status != 'complete'
  `).bind(projectId).all();

  for (const m of proofRequired.results) {
    const milestone = m as { id: string; name: string; due_date: string };
    actions.push({
      id: `proof-${milestone.id}`,
      type: 'proof_required',
      severity: 'high',
      title: `Proof required: ${milestone.name}`,
      description: 'Upload proof of completion (screenshot, receipt, etc.)',
      action_url: `/milestone/${milestone.id}`,
      action_label: 'Upload Proof',
      dismissible: false,
      metadata: { milestone_id: milestone.id },
    });
  }

  // Sort by severity (high → medium → low), then by type priority
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const typeOrder = {
    milestone_overdue: 0,
    proof_required: 1,
    notes_unacknowledged: 2,
    content_quota: 3,
    budget_warning: 4,
  };

  actions.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return typeOrder[a.type] - typeOrder[b.type];
  });

  return { actions, count: actions.length };
}
