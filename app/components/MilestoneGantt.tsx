import { Link } from 'react-router';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { CheckCircle2, Circle, AlertCircle, Clock, ZoomIn, ZoomOut, Filter } from 'lucide-react';
import { useState } from 'react';

interface QuotaStatus {
  quota_met: boolean;
  requirements: Array<{
    content_type: string;
    required: number;
    actual: number;
    missing: number;
    met: boolean;
  }>;
  message: string;
}

interface Milestone {
  id: string;
  name: string;
  description?: string | null;
  due_date: string;
  status: string;
  blocks_release: number;
  completed_at?: string | null;
  quota_status?: QuotaStatus;
}

interface MilestoneGanttProps {
  milestones: Milestone[];
  releaseDate: string;
  projectStartDate?: string;
}

export function MilestoneGantt({ milestones, releaseDate, projectStartDate }: MilestoneGanttProps) {
  // State for filters and zoom
  const [filterType, setFilterType] = useState<'all' | 'blocking' | 'incomplete' | 'overdue'>('all');
  const [zoomRange, setZoomRange] = useState<'all' | '30days' | '60days' | 'thisMonth'>('all');

  // Sort milestones by due date
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  const now = new Date();

  // Apply filters
  const filteredMilestones = sortedMilestones.filter(milestone => {
    if (filterType === 'blocking') return milestone.blocks_release === 1;
    if (filterType === 'incomplete') return milestone.status !== 'complete';
    if (filterType === 'overdue') {
      const dueDate = new Date(milestone.due_date);
      return dueDate < now && milestone.status !== 'complete';
    }
    return true;
  });

  // Calculate timeline bounds with zoom applied
  const firstMilestoneDate = filteredMilestones[0]?.due_date
    ? new Date(filteredMilestones[0].due_date)
    : new Date();

  let startDate: Date;
  let endDate: Date;

  if (zoomRange === 'all') {
    startDate = projectStartDate
      ? new Date(projectStartDate)
      : new Date(firstMilestoneDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    endDate = new Date(releaseDate);
  } else if (zoomRange === 'thisMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (zoomRange === '30days') {
    startDate = new Date(now);
    endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  } else { // 60days
    startDate = new Date(now);
    endDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  }

  const totalDuration = endDate.getTime() - startDate.getTime();

  // Filter milestones that fall within zoom range
  const visibleMilestones = filteredMilestones.filter(milestone => {
    const milestoneDate = new Date(milestone.due_date);
    return milestoneDate >= startDate && milestoneDate <= endDate;
  });

  // Calculate milestone duration (assume each milestone spans until the next one, or 1 week for the last)
  const getMilestoneDuration = (milestone: Milestone, index: number) => {
    const milestoneDate = new Date(milestone.due_date);
    const nextMilestone = filteredMilestones[index + 1];
    const MIN_DURATION = 3 * 24 * 60 * 60 * 1000; // Minimum 3 days

    if (nextMilestone) {
      const duration = new Date(nextMilestone.due_date).getTime() - milestoneDate.getTime();
      // If same date or very close, use minimum duration
      return Math.max(duration, MIN_DURATION);
    } else {
      // Last milestone: span until release date or end of zoom range
      const targetEnd = zoomRange === 'all' ? new Date(releaseDate) : endDate;
      const duration = targetEnd.getTime() - milestoneDate.getTime();
      return Math.max(duration, MIN_DURATION);
    }
  };

  // Calculate position and width for each milestone bar
  const getMilestoneBar = (milestone: Milestone, index: number) => {
    const milestoneDate = new Date(milestone.due_date);
    const duration = getMilestoneDuration(milestone, index);

    const startOffset = milestoneDate.getTime() - startDate.getTime();
    const left = (startOffset / totalDuration) * 100;
    const width = (duration / totalDuration) * 100;

    return {
      left: Math.max(0, Math.min(100, left)),
      width: Math.max(2, Math.min(100 - left, width)), // Minimum 2% width for visibility
      actualLeft: left // Store actual position for tooltip positioning
    };
  };

  // Get current progress position
  const currentPosition = Math.max(0, Math.min(100,
    ((now.getTime() - startDate.getTime()) / totalDuration) * 100
  ));

  const getMilestoneColor = (milestone: Milestone) => {
    const isOverdue = new Date(milestone.due_date) < now && milestone.status !== 'complete';

    if (milestone.status === 'complete') return 'bg-primary/80 border-primary';
    if (isOverdue) return 'bg-destructive/80 border-destructive';
    if (milestone.status === 'in_progress') return 'bg-yellow-500/80 border-yellow-500';
    return 'bg-muted border-border';
  };

  const getMilestoneIcon = (milestone: Milestone) => {
    const isOverdue = new Date(milestone.due_date) < now && milestone.status !== 'complete';

    if (milestone.status === 'complete') {
      return <CheckCircle2 className="w-4 h-4 text-primary" />;
    }
    if (isOverdue) {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
    if (milestone.status === 'in_progress') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calculate content quota completion percentage
  const getQuotaCompletionPercent = (milestone: Milestone) => {
    if (!milestone.quota_status || milestone.quota_status.requirements.length === 0) {
      return 100; // No requirements = complete
    }

    const requirements = milestone.quota_status.requirements;
    let totalRequired = 0;
    let totalActual = 0;

    requirements.forEach(req => {
      totalRequired += req.required;
      totalActual += req.actual;
    });

    if (totalRequired === 0) return 100;
    return Math.round((totalActual / totalRequired) * 100);
  };

  // Get days remaining for a milestone
  const getDaysRemaining = (dueDate: string) => {
    return Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get color for days remaining
  const getDaysRemainingColor = (milestone: Milestone) => {
    const days = getDaysRemaining(milestone.due_date);
    if (days < 0) return 'text-destructive';
    if (days < 7) return 'text-yellow-500';
    return 'text-green-400';
  };

  // Handle empty state
  if (sortedMilestones.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="pt-12 pb-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg mb-2">No milestones yet</p>
            <p className="text-sm">Milestones will appear here once they're added to the project.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="pt-8 pb-12 overflow-x-auto">
        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-border">
          {/* Filter Controls */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            <div className="flex gap-1">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="text-xs h-7"
              >
                All ({sortedMilestones.length})
              </Button>
              <Button
                variant={filterType === 'blocking' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('blocking')}
                className="text-xs h-7"
              >
                Blocking ({sortedMilestones.filter(m => m.blocks_release === 1).length})
              </Button>
              <Button
                variant={filterType === 'incomplete' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('incomplete')}
                className="text-xs h-7"
              >
                Incomplete ({sortedMilestones.filter(m => m.status !== 'complete').length})
              </Button>
              <Button
                variant={filterType === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('overdue')}
                className="text-xs h-7"
              >
                Overdue ({sortedMilestones.filter(m => new Date(m.due_date) < now && m.status !== 'complete').length})
              </Button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Zoom:</span>
            <div className="flex gap-1">
              <Button
                variant={zoomRange === 'thisMonth' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZoomRange('thisMonth')}
                className="text-xs h-7"
              >
                This Month
              </Button>
              <Button
                variant={zoomRange === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZoomRange('30days')}
                className="text-xs h-7"
              >
                30 Days
              </Button>
              <Button
                variant={zoomRange === '60days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZoomRange('60days')}
                className="text-xs h-7"
              >
                60 Days
              </Button>
              <Button
                variant={zoomRange === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZoomRange('all')}
                className="text-xs h-7"
              >
                All
              </Button>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Release Timeline</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(startDate)} → {formatDate(zoomRange === 'all' ? releaseDate : endDate.toISOString())}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              Showing {visibleMilestones.length} of {filteredMilestones.length} milestones
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="space-y-3 min-w-[800px]">
          {/* Timeline Header with Month Markers */}
          <div className="relative h-8 mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-border" />
            </div>
            {/* Month markers */}
            {(() => {
              const markers = [];
              const current = new Date(startDate);
              current.setDate(1); // Start of month

              while (current <= endDate) {
                const position = ((current.getTime() - startDate.getTime()) / totalDuration) * 100;
                if (position >= 0 && position <= 100) {
                  markers.push(
                    <div
                      key={current.toISOString()}
                      className="absolute top-0 transform -translate-x-1/2"
                      style={{ left: `${position}%` }}
                    >
                      <div className="text-xs text-muted-foreground font-medium">
                        {current.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="w-px h-4 bg-border mx-auto" />
                    </div>
                  );
                }
                current.setMonth(current.getMonth() + 1);
              }
              return markers;
            })()}
          </div>

          {/* Milestone Rows */}
          <div className="space-y-2">
            {visibleMilestones.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No milestones in this time range</p>
                <p className="text-sm mt-1">Try adjusting the zoom or filter settings</p>
              </div>
            ) : (
              visibleMilestones.map((milestone, index) => {
                const bar = getMilestoneBar(milestone, index);

              return (
                <Link
                  key={milestone.id}
                  to={`/milestone/${milestone.id}`}
                  className="block group cursor-pointer"
                >
                  <div className="flex items-center gap-3 hover:bg-accent/50 rounded-lg p-2 transition-colors">
                    {/* Milestone Name */}
                    <div className="w-48 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {getMilestoneIcon(milestone)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {milestone.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Due: {formatDate(milestone.due_date)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gantt Bar Container */}
                    <div className="flex-1 relative h-10">
                      {/* Current date indicator line - only show on first row */}
                      {index === 0 && currentPosition >= 0 && currentPosition <= 100 && (
                        <div
                          className="absolute w-px bg-primary z-10"
                          style={{
                            left: `${currentPosition}%`,
                            top: '-2rem',
                            height: `calc(${visibleMilestones.length * 3.5}rem + 2rem)`
                          }}
                        />
                      )}

                      {/* Milestone Bar */}
                      <div
                        className={`
                          absolute top-1/2 -translate-y-1/2 rounded overflow-hidden
                          border-2 transition-all duration-300 ease-out transform-gpu
                          group-hover:shadow-2xl group-hover:scale-y-125 group-hover:z-10
                          group-hover:border-primary/80
                          ${milestone.blocks_release === 1 ? 'h-10 ring-2 ring-destructive/40 ring-offset-2 ring-offset-background' : 'h-8'}
                          ${getMilestoneColor(milestone)}
                        `}
                        style={{
                          left: `${Math.max(0, bar.left)}%`,
                          width: `${Math.min(bar.width, 100 - Math.max(0, bar.left))}%`,
                        }}
                      >
                        {/* Progress fill (content quota visualization) */}
                        {milestone.status !== 'complete' && milestone.quota_status && (
                          <div
                            className="absolute inset-0 bg-primary/20 transition-all duration-500 ease-out"
                            style={{ width: `${getQuotaCompletionPercent(milestone)}%` }}
                          />
                        )}

                        {/* Content */}
                        <div className="relative h-full flex items-center justify-between px-2 gap-2">
                          <div className="text-xs font-medium text-foreground/90 truncate flex items-center gap-2">
                            {milestone.name}
                            {milestone.status !== 'complete' && milestone.quota_status && milestone.quota_status.requirements.length > 0 && (
                              <span className="text-[10px] opacity-70 font-normal whitespace-nowrap">
                                {milestone.quota_status.quota_met ? '✓' : `${getQuotaCompletionPercent(milestone)}%`}
                              </span>
                            )}
                          </div>
                          {milestone.blocks_release === 1 && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-destructive/20 text-destructive border-destructive flex-shrink-0">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Tooltip on hover - dynamic positioning */}
                      <div
                        className="absolute bottom-full mb-2 hidden group-hover:block z-20"
                        style={{
                          left: bar.actualLeft < 25 ? '0%' : bar.actualLeft > 75 ? '100%' : '50%',
                          transform: bar.actualLeft < 25 ? 'translateX(0)' : bar.actualLeft > 75 ? 'translateX(-100%)' : 'translateX(-50%)'
                        }}
                      >
                        <div className="bg-gray-900 text-white border border-gray-700 rounded-lg p-4 shadow-2xl min-w-[280px] max-w-[320px]">
                          {/* Header with status icon */}
                          <div className="flex items-center gap-2 mb-3">
                            {getMilestoneIcon(milestone)}
                            <div className="font-semibold text-white text-base">{milestone.name}</div>
                          </div>

                          {/* Description */}
                          {milestone.description && (
                            <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                              {milestone.description}
                            </p>
                          )}

                          {/* Key metrics in grid */}
                          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                            <div>
                              <div className="text-gray-400 mb-1">Due Date</div>
                              <div className="text-gray-200 font-medium">{formatDate(milestone.due_date)}</div>
                            </div>
                            <div>
                              <div className="text-gray-400 mb-1">Status</div>
                              <div className="text-gray-200 font-medium">{formatStatus(milestone.status)}</div>
                            </div>
                          </div>

                          {/* Days remaining indicator */}
                          {milestone.status !== 'complete' && (
                            <div className="mb-3 p-2 bg-gray-800 rounded">
                              <div className="text-xs text-gray-400">Days Remaining</div>
                              <div className={`text-lg font-bold ${getDaysRemainingColor(milestone)}`}>
                                {getDaysRemaining(milestone.due_date)} days
                              </div>
                            </div>
                          )}

                          {/* Content quota status */}
                          {milestone.quota_status && milestone.quota_status.requirements.length > 0 && (
                            <div className="mb-3 p-2 bg-gray-800 rounded">
                              <div className="text-xs text-gray-400 mb-1">Content Quota</div>
                              <div className="space-y-1">
                                {milestone.quota_status.requirements.map((req) => (
                                  <div key={req.content_type} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-300 capitalize">
                                      {req.content_type.replace('_', ' ')}:
                                    </span>
                                    <span className={req.met ? 'text-green-400' : 'text-yellow-500'}>
                                      {req.actual}/{req.required} {req.met ? '✓' : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Completion indicator */}
                          {milestone.completed_at && (
                            <div className="flex items-center gap-2 text-green-400 text-sm mb-3">
                              <CheckCircle2 className="w-4 h-4" />
                              Completed {formatDate(milestone.completed_at)}
                            </div>
                          )}

                          {/* Quick action */}
                          <div className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                            <span>Click to view details</span>
                            <span className="text-gray-500">→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
            )}
          </div>

          {/* Current Date Indicator - aligned with chart */}
          {currentPosition >= 0 && currentPosition <= 100 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="w-48 flex-shrink-0" /> {/* Spacer to match milestone name column */}
              <div className="flex-1 relative">
                <div className="absolute" style={{ left: `${currentPosition}%` }}>
                  <div className="flex items-center gap-2 text-xs text-primary font-medium -translate-x-1/2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Today
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-6 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded bg-primary/80 border-2 border-primary" />
              <span className="text-muted-foreground">Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded bg-yellow-500/80 border-2 border-yellow-500" />
              <span className="text-muted-foreground">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded bg-destructive/80 border-2 border-destructive" />
              <span className="text-muted-foreground">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded bg-muted border-2 border-border" />
              <span className="text-muted-foreground">Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
