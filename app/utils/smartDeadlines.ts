/**
 * Smart Deadlines Engine
 *
 * Calculates recommended deadlines based on industry best practices
 * and compares them against actual milestone deadlines to detect risks.
 */

export interface Milestone {
  id: string;
  name: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'complete' | 'overdue';
  blocks_release: number;
  proof_required: number;
}

export interface DeadlineRecommendation {
  milestone_id: string;
  milestone_name: string;
  actual_date: Date;
  recommended_date: Date;
  days_difference: number;
  buffer_days: number;
  risk_level: 'safe' | 'tight' | 'risky' | 'critical';
  recommendation_reason: string;
  is_critical: boolean;
}

export interface SmartDeadlineAnalysis {
  release_date: Date;
  total_days_to_release: number;
  recommendations: DeadlineRecommendation[];
  overall_risk: 'safe' | 'tight' | 'risky' | 'critical';
  has_conflicts: boolean;
  conflict_count: number;
}

/**
 * Industry-standard buffer times (in days before release or dependent milestone)
 * Based on common music industry timelines
 */
const MILESTONE_BUFFERS: Record<string, number> = {
  // Production milestones
  'Recording Complete': 90,          // 90 days before release (3 months for post-production)
  'Mixing Complete': 60,             // 60 days before release (2 months for mastering + admin)
  'Mastering Complete': 45,          // 45 days before release (1.5 months for distribution + marketing)

  // Administrative milestones
  'Metadata Tagging Complete': 35,   // 35 days before release (5 weeks for distribution upload)
  'Artwork Finalized': 35,           // 35 days before release (needed with metadata)

  // Distribution milestones
  'Upload to Distributor': 30,       // 30 days before release (industry standard minimum)
  'Spotify Playlist Submission': 28, // 28 days before release (4 weeks - Spotify requirement)

  // Marketing milestones
  'Teaser Content Released': 21,     // 21 days before release (3 weeks of buzz)
  'Marketing Campaign Launch': 14,   // 14 days before release (2 weeks of active promo)
  'Pre-Save Campaign Active': 14,    // 14 days before release (2 weeks for pre-saves)

  // Release
  'Release Day': 0,                  // The day itself
};

/**
 * Critical milestones that absolutely cannot be late
 */
const CRITICAL_MILESTONES = [
  'Upload to Distributor',
  'Spotify Playlist Submission',
  'Release Day',
  'Metadata Tagging Complete',
];

/**
 * Calculate recommended deadline for a milestone based on release date
 */
function calculateRecommendedDate(milestoneName: string, releaseDate: Date): Date {
  const bufferDays = MILESTONE_BUFFERS[milestoneName] || 30; // Default 30 days
  const recommendedDate = new Date(releaseDate);
  recommendedDate.setDate(recommendedDate.getDate() - bufferDays);
  return recommendedDate;
}

/**
 * Calculate days difference between two dates
 */
function daysDifference(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Determine risk level based on days difference and buffer
 */
function calculateRiskLevel(
  daysDiff: number,
  bufferDays: number,
  isCritical: boolean
): 'safe' | 'tight' | 'risky' | 'critical' {
  // Negative means actual is BEFORE recommended (good)
  // Positive means actual is AFTER recommended (bad)

  if (daysDiff <= -7) return 'safe';        // 7+ days early
  if (daysDiff <= 0) return 'tight';        // On time or slightly early
  if (daysDiff <= 7) return 'risky';        // Up to 1 week late
  return 'critical';                        // More than 1 week late
}

/**
 * Generate recommendation reason based on analysis
 */
function generateRecommendation(
  milestoneName: string,
  daysDiff: number,
  bufferDays: number,
  isCritical: boolean
): string {
  if (daysDiff <= -7) {
    return `Excellent! ${Math.abs(daysDiff)} days of extra buffer time.`;
  } else if (daysDiff <= 0) {
    return `On track with ${bufferDays} day industry-standard buffer.`;
  } else if (daysDiff <= 7) {
    return `⚠️ ${daysDiff} days late. Consider moving earlier to avoid ${isCritical ? 'critical ' : ''}delays.`;
  } else {
    return `🚨 ${daysDiff} days past recommended deadline. ${isCritical ? 'This is a critical milestone - immediate action required!' : 'Adjust timeline ASAP.'}`;
  }
}

/**
 * Main function: Analyze all milestones and generate smart deadline recommendations
 */
export function analyzeSmartDeadlines(
  milestones: Milestone[],
  releaseDate: string
): SmartDeadlineAnalysis {
  const releaseDateObj = new Date(releaseDate);
  const today = new Date();
  const totalDaysToRelease = daysDifference(today, releaseDateObj);

  const recommendations: DeadlineRecommendation[] = milestones.map(milestone => {
    const actualDate = new Date(milestone.due_date);
    const recommendedDate = calculateRecommendedDate(milestone.name, releaseDateObj);
    const daysDiff = daysDifference(recommendedDate, actualDate);
    const bufferDays = MILESTONE_BUFFERS[milestone.name] || 30;
    const isCritical = CRITICAL_MILESTONES.includes(milestone.name) || milestone.blocks_release === 1;

    return {
      milestone_id: milestone.id,
      milestone_name: milestone.name,
      actual_date: actualDate,
      recommended_date: recommendedDate,
      days_difference: daysDiff,
      buffer_days: bufferDays,
      risk_level: calculateRiskLevel(daysDiff, bufferDays, isCritical),
      recommendation_reason: generateRecommendation(milestone.name, daysDiff, bufferDays, isCritical),
      is_critical: isCritical,
    };
  });

  // Calculate overall risk
  const criticalCount = recommendations.filter(r => r.risk_level === 'critical').length;
  const riskyCount = recommendations.filter(r => r.risk_level === 'risky').length;
  const conflictCount = recommendations.filter(r => r.days_difference > 0).length;

  let overallRisk: 'safe' | 'tight' | 'risky' | 'critical' = 'safe';
  if (criticalCount > 0) overallRisk = 'critical';
  else if (riskyCount > 2) overallRisk = 'risky';
  else if (riskyCount > 0 || conflictCount > 3) overallRisk = 'tight';

  return {
    release_date: releaseDateObj,
    total_days_to_release: totalDaysToRelease,
    recommendations,
    overall_risk: overallRisk,
    has_conflicts: conflictCount > 0,
    conflict_count: conflictCount,
  };
}

/**
 * Get recommended buffer for a specific milestone type
 */
export function getRecommendedBuffer(milestoneName: string): number {
  return MILESTONE_BUFFERS[milestoneName] || 30;
}

/**
 * Check if a milestone is critical for release
 */
export function isCriticalMilestone(milestoneName: string): boolean {
  return CRITICAL_MILESTONES.includes(milestoneName);
}
