import { Link } from 'react-router';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  description?: string;
  due_date: string;
  status: string;
  blocks_release: number;
  completed_at?: string;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  releaseDate: string;
  projectStartDate?: string;
}

export function MilestoneTimeline({ milestones, releaseDate, projectStartDate }: MilestoneTimelineProps) {
  // Sort milestones by due date
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  const startDate = projectStartDate
    ? new Date(projectStartDate)
    : new Date(sortedMilestones[0]?.due_date || Date.now());
  const endDate = new Date(releaseDate);
  const totalDuration = endDate.getTime() - startDate.getTime();
  const now = new Date();

  // Calculate position percentage for each milestone
  const getMilestonePosition = (dueDate: string) => {
    const date = new Date(dueDate);
    const duration = date.getTime() - startDate.getTime();
    return Math.max(0, Math.min(100, (duration / totalDuration) * 100));
  };

  // Get current progress position
  const currentPosition = Math.max(0, Math.min(100,
    ((now.getTime() - startDate.getTime()) / totalDuration) * 100
  ));

  const getMilestoneIcon = (milestone: Milestone) => {
    const isOverdue = new Date(milestone.due_date) < now && milestone.status !== 'complete';

    if (milestone.status === 'complete') {
      return <CheckCircle2 className="w-6 h-6 text-primary" />;
    }
    if (isOverdue) {
      return <AlertCircle className="w-6 h-6 text-destructive" />;
    }
    if (milestone.status === 'in_progress') {
      return <Clock className="w-6 h-6 text-yellow-500" />;
    }
    return <Circle className="w-6 h-6 text-muted-foreground" />;
  };

  const getMilestoneColor = (milestone: Milestone) => {
    const isOverdue = new Date(milestone.due_date) < now && milestone.status !== 'complete';

    if (milestone.status === 'complete') return 'border-primary bg-primary/10';
    if (isOverdue) return 'border-destructive bg-destructive/10';
    if (milestone.status === 'in_progress') return 'border-yellow-500 bg-yellow-500/10';
    return 'border-muted bg-muted/50';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-8 pb-12">
        {/* Timeline Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">
              {formatDate(startDate.toISOString())}
            </div>
            <div className="text-sm font-medium text-primary">
              Release: {formatDate(releaseDate)}
            </div>
          </div>
        </div>

        {/* Timeline Container */}
        <div className="relative px-4">
          {/* Background Track */}
          <div className="absolute top-12 left-0 right-0 h-1 bg-border rounded-full" />

          {/* Progress Track */}
          <div
            className="absolute top-12 left-0 h-1 bg-primary rounded-full transition-all duration-500"
            style={{ width: `${currentPosition}%` }}
          />

          {/* Current Date Indicator */}
          {currentPosition >= 0 && currentPosition <= 100 && (
            <div
              className="absolute top-8 transition-all duration-500"
              style={{ left: `${currentPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-primary mb-2">Today</div>
                <div className="w-0.5 h-16 bg-primary" />
              </div>
            </div>
          )}

          {/* Milestones */}
          <div className="relative">
            {sortedMilestones.map((milestone, index) => {
              const position = getMilestonePosition(milestone.due_date);

              return (
                <Link
                  key={milestone.id}
                  to={`/milestone/${milestone.id}`}
                  className="absolute group cursor-pointer"
                  style={{
                    left: `${position}%`,
                    transform: 'translateX(-50%)',
                    top: index % 2 === 0 ? '-60px' : '60px'
                  }}
                >
                  {/* Connector Line */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-0.5 bg-border ${
                      index % 2 === 0 ? 'top-full h-14' : 'bottom-full h-14'
                    }`}
                  />

                  {/* Milestone Node */}
                  <div className="flex flex-col items-center gap-2 min-w-[120px] max-w-[160px]">
                    <div
                      className={`
                        w-12 h-12 rounded-full border-4 flex items-center justify-center
                        transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg
                        ${getMilestoneColor(milestone)}
                      `}
                    >
                      {getMilestoneIcon(milestone)}
                    </div>

                    {/* Milestone Info Card */}
                    <div className="text-center">
                      <div className="text-xs font-semibold mb-1 group-hover:text-primary transition-colors">
                        {milestone.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(milestone.due_date)}
                      </div>
                      {milestone.blocks_release === 1 && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-xs bg-destructive/10 text-destructive border-destructive"
                        >
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Hover Tooltip */}
                  <div className="
                    absolute left-1/2 -translate-x-1/2 bottom-full mb-2
                    hidden group-hover:block z-10
                  ">
                    <div className="bg-popover text-popover-foreground border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
                      <div className="font-semibold mb-1">{milestone.name}</div>
                      {milestone.description && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {milestone.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Click to view details →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Release Flag */}
          <div
            className="absolute top-8"
            style={{ left: '100%', transform: 'translateX(-50%)' }}
          >
            <div className="flex flex-col items-center">
              <div className="text-sm font-bold text-primary mb-2">🏁</div>
              <div className="w-0.5 h-16 bg-primary" />
              <div className="w-4 h-4 rounded-full bg-primary border-4 border-background" />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-24 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-6 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-muted-foreground">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-muted-foreground">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
