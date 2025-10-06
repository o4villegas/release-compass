/**
 * Cleared-for-Release Calculation Utility
 * Phase 2.3 requirement: Check all milestone/budget/legal requirements
 */

export interface ClearedForReleaseResult {
  cleared: boolean;
  reasons: string[];
  missing_requirements: {
    milestones?: string[];
    budget?: string[];
    legal?: string[];
    files?: string[];
  };
}

/**
 * Checks if a project is cleared for release
 *
 * Requirements:
 * 1. All milestones must be complete
 * 2. Master file uploaded with metadata (ISRC, genre, explicit_content)
 * 3. Artwork file uploaded
 * 4. Contract uploaded
 * 5. Budget within limits (not overspent)
 * 6. All master file notes acknowledged
 */
export async function checkClearedForRelease(
  db: D1Database,
  projectId: string
): Promise<ClearedForReleaseResult> {
  const reasons: string[] = [];
  const missing_requirements: ClearedForReleaseResult['missing_requirements'] = {};

  // 1. Check milestone completion
  const incompleteMilestones = await db.prepare(`
    SELECT name FROM milestones
    WHERE project_id = ? AND status != 'complete'
    ORDER BY name ASC
  `).bind(projectId).all();

  if (incompleteMilestones.results.length > 0) {
    const milestoneNames = incompleteMilestones.results.map((m: any) => m.name);
    missing_requirements.milestones = milestoneNames;
    reasons.push(`${incompleteMilestones.results.length} milestone(s) incomplete: ${milestoneNames.join(', ')}`);
  }

  // 2. Check master file with complete metadata
  const masterFile = await db.prepare(`
    SELECT id, metadata_json, metadata_complete, notes_acknowledged
    FROM files
    WHERE project_id = ? AND file_type = 'master'
    ORDER BY uploaded_at DESC
    LIMIT 1
  `).bind(projectId).first();

  const missingFiles: string[] = [];

  if (!masterFile) {
    missingFiles.push('Master audio file');
    reasons.push('Master audio file not uploaded');
  } else {
    // Parse metadata JSON
    let metadata: any = null;
    if (masterFile.metadata_json) {
      try {
        metadata = JSON.parse(masterFile.metadata_json as string);
      } catch (e) {
        // Invalid JSON
      }
    }

    // Check metadata completeness
    if (!masterFile.metadata_complete || !metadata) {
      missingFiles.push('Master metadata');
      reasons.push('Master file metadata incomplete');
    } else {
      // Check individual metadata fields
      if (!metadata.isrc) {
        missingFiles.push('Master ISRC');
        reasons.push('Master file missing ISRC code');
      }
      if (!metadata.genre) {
        missingFiles.push('Master genre');
        reasons.push('Master file missing genre');
      }
      if (metadata.explicit_content === null || metadata.explicit_content === undefined) {
        missingFiles.push('Master explicit content flag');
        reasons.push('Master file missing explicit content flag');
      }
    }

    // Check note acknowledgment
    const hasUnacknowledgedNotes = await db.prepare(`
      SELECT COUNT(*) as count FROM file_notes
      WHERE file_id = ?
    `).bind(masterFile.id).first();

    if ((hasUnacknowledgedNotes?.count as number) > 0 && masterFile.notes_acknowledged === 0) {
      missingFiles.push('Master file note acknowledgment');
      reasons.push('Master file has unacknowledged notes');
    }
  }

  // 3. Check artwork file
  const artworkFile = await db.prepare(`
    SELECT id FROM files
    WHERE project_id = ? AND file_type = 'artwork'
    ORDER BY uploaded_at DESC
    LIMIT 1
  `).bind(projectId).first();

  if (!artworkFile) {
    missingFiles.push('Artwork file');
    reasons.push('Artwork file not uploaded');
  }

  // 4. Check contract file
  const contractFile = await db.prepare(`
    SELECT id FROM files
    WHERE project_id = ? AND file_type = 'contracts'
    ORDER BY uploaded_at DESC
    LIMIT 1
  `).bind(projectId).first();

  if (!contractFile) {
    missingFiles.push('Contract file');
    reasons.push('Contract not uploaded');
  }

  if (missingFiles.length > 0) {
    missing_requirements.files = missingFiles;
  }

  // 5. Check budget status
  const project = await db.prepare(`
    SELECT total_budget FROM projects WHERE id = ?
  `).bind(projectId).first();

  const budgetItems = await db.prepare(`
    SELECT SUM(amount) as total_spent FROM budget_items WHERE project_id = ?
  `).bind(projectId).first();

  const totalSpent = (budgetItems?.total_spent as number) || 0;
  const totalBudget = (project?.total_budget as number) || 0;

  if (totalSpent > totalBudget) {
    missing_requirements.budget = ['Budget overspent'];
    reasons.push(`Budget overspent: $${totalSpent.toFixed(2)} / $${totalBudget.toFixed(2)}`);
  }

  // Determine if cleared
  const cleared = reasons.length === 0;

  return {
    cleared,
    reasons: cleared ? ['All requirements met - cleared for release'] : reasons,
    missing_requirements: cleared ? {} : missing_requirements,
  };
}

/**
 * Get summary of cleared-for-release status for display
 */
export function getClearedForReleaseSummary(result: ClearedForReleaseResult): string {
  if (result.cleared) {
    return '✅ Cleared for Release - All requirements met';
  }

  const total = result.reasons.length;
  return `❌ Not Cleared - ${total} requirement(s) missing`;
}

/**
 * Get detailed requirements breakdown for display
 */
export function getClearedForReleaseDetails(result: ClearedForReleaseResult): {
  category: string;
  items: string[];
}[] {
  const details: { category: string; items: string[] }[] = [];

  if (result.missing_requirements.milestones) {
    details.push({
      category: 'Milestones',
      items: result.missing_requirements.milestones,
    });
  }

  if (result.missing_requirements.files) {
    details.push({
      category: 'Files',
      items: result.missing_requirements.files,
    });
  }

  if (result.missing_requirements.budget) {
    details.push({
      category: 'Budget',
      items: result.missing_requirements.budget,
    });
  }

  if (result.missing_requirements.legal) {
    details.push({
      category: 'Legal',
      items: result.missing_requirements.legal,
    });
  }

  return details;
}
