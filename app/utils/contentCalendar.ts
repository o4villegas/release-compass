/**
 * Content Calendar Utilities
 *
 * Helps artists plan and schedule content posting timeline
 */

export interface ScheduledContent {
  id: string;
  content_id: string;
  scheduled_date: string;
  scheduled_platforms: string | null;
  scheduling_notes: string | null;
  content?: {
    id: string;
    content_type: string;
    caption_draft: string | null;
    storage_key: string;
    intended_platforms: string | null;
  };
}

export interface CalendarDay {
  date: Date;
  dateString: string;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  scheduledContent: ScheduledContent[];
  milestoneDeadlines: {
    id: string;
    name: string;
    status: string;
  }[];
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

/**
 * Generate calendar weeks for a given month
 */
export function generateCalendarMonth(
  year: number,
  month: number, // 0-indexed (0 = January)
  scheduledContent: ScheduledContent[],
  milestones: Array<{ id: string; name: string; due_date: string; status: string }>
): CalendarWeek[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Sunday before the first day of the month
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // End on the Saturday after the last day of the month
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const weeks: CalendarWeek[] = [];
  let currentDate = new Date(startDate);
  let weekNumber = 1;

  while (currentDate <= endDate) {
    const week: CalendarDay[] = [];

    for (let i = 0; i < 7; i++) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();

      // Find scheduled content for this day
      const dayScheduledContent = scheduledContent.filter(
        sc => sc.scheduled_date.startsWith(dateString)
      );

      // Find milestone deadlines for this day
      const dayMilestones = milestones.filter(
        m => m.due_date.startsWith(dateString)
      ).map(m => ({
        id: m.id,
        name: m.name,
        status: m.status
      }));

      week.push({
        date: new Date(currentDate),
        dateString,
        isToday: currentDate.getTime() === today.getTime(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isPast: currentDate < today,
        scheduledContent: dayScheduledContent,
        milestoneDeadlines: dayMilestones
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    weeks.push({ weekNumber, days: week });
    weekNumber++;
  }

  return weeks;
}

/**
 * Get optimal posting schedule based on release date
 */
export function suggestPostingSchedule(
  releaseDate: string,
  availableContent: Array<{ id: string; content_type: string }>
): { date: string; content_type: string; reason: string }[] {
  const release = new Date(releaseDate);
  const suggestions: { date: string; content_type: string; reason: string }[] = [];

  // 4 weeks before: First teaser
  const fourWeeksBefore = new Date(release);
  fourWeeksBefore.setDate(fourWeeksBefore.getDate() - 28);
  suggestions.push({
    date: fourWeeksBefore.toISOString().split('T')[0],
    content_type: 'short_video',
    reason: '4 weeks before release - Build initial anticipation'
  });

  // 3 weeks before: Behind the scenes
  const threeWeeksBefore = new Date(release);
  threeWeeksBefore.setDate(threeWeeksBefore.getDate() - 21);
  suggestions.push({
    date: threeWeeksBefore.toISOString().split('T')[0],
    content_type: 'photo',
    reason: '3 weeks before - Behind the scenes content'
  });

  // 2 weeks before: Second teaser / pre-save announcement
  const twoWeeksBefore = new Date(release);
  twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
  suggestions.push({
    date: twoWeeksBefore.toISOString().split('T')[0],
    content_type: 'short_video',
    reason: '2 weeks before - Pre-save campaign launch'
  });

  // 1 week before: Final teaser
  const oneWeekBefore = new Date(release);
  oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
  suggestions.push({
    date: oneWeekBefore.toISOString().split('T')[0],
    content_type: 'short_video',
    reason: '1 week countdown - Final push'
  });

  // 3 days before: Countdown content
  const threeDaysBefore = new Date(release);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  suggestions.push({
    date: threeDaysBefore.toISOString().split('T')[0],
    content_type: 'photo',
    reason: '3-day countdown'
  });

  // Release day: Announcement
  suggestions.push({
    date: releaseDate,
    content_type: 'long_video',
    reason: 'Release day - Official announcement'
  });

  // 1 day after: Thank you / engagement
  const oneDayAfter = new Date(release);
  oneDayAfter.setDate(oneDayAfter.getDate() + 1);
  suggestions.push({
    date: oneDayAfter.toISOString().split('T')[0],
    content_type: 'photo',
    reason: 'Day after - Thank fans, share reactions'
  });

  return suggestions;
}

/**
 * Check for scheduling conflicts
 */
export function findSchedulingConflicts(
  scheduledContent: ScheduledContent[]
): { date: string; count: number; items: ScheduledContent[] }[] {
  const contentByDate = scheduledContent.reduce((acc, item) => {
    const date = item.scheduled_date.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, ScheduledContent[]>);

  return Object.entries(contentByDate)
    .filter(([_, items]) => items.length > 3) // More than 3 posts per day = potential spam
    .map(([date, items]) => ({
      date,
      count: items.length,
      items
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate posting frequency statistics
 */
export function calculatePostingFrequency(
  scheduledContent: ScheduledContent[],
  startDate: string,
  endDate: string
): {
  totalPosts: number;
  averagePerWeek: number;
  busiestDay: string | null;
  quietestWeek: { start: string; end: string; count: number } | null;
} {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.ceil(totalDays / 7);

  const filtered = scheduledContent.filter(sc => {
    const date = new Date(sc.scheduled_date);
    return date >= start && date <= end;
  });

  const contentByDate = filtered.reduce((acc, item) => {
    const date = item.scheduled_date.split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const busiestDay = Object.entries(contentByDate)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  return {
    totalPosts: filtered.length,
    averagePerWeek: totalWeeks > 0 ? filtered.length / totalWeeks : 0,
    busiestDay,
    quietestWeek: null // TODO: Implement if needed
  };
}
