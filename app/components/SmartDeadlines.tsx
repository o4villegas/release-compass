import { analyzeSmartDeadlines, type Milestone, type DeadlineRecommendation } from '~/utils/smartDeadlines';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, TrendingDown } from 'lucide-react';

interface SmartDeadlinesProps {
  milestones: Milestone[];
  releaseDate: string;
  projectId: string;
}

const RISK_COLORS = {
  safe: {
    bg: 'bg-green-950/30',
    border: 'border-green-500/40',
    text: 'text-green-400',
    badge: 'bg-green-500',
    icon: CheckCircle,
  },
  tight: {
    bg: 'bg-blue-950/30',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    badge: 'bg-blue-500',
    icon: Clock,
  },
  risky: {
    bg: 'bg-yellow-950/30',
    border: 'border-yellow-500/40',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500',
    icon: AlertTriangle,
  },
  critical: {
    bg: 'bg-red-950/30',
    border: 'border-red-500/40',
    text: 'text-red-400',
    badge: 'bg-red-500',
    icon: AlertTriangle,
  },
};

export function SmartDeadlines({ milestones, releaseDate, projectId }: SmartDeadlinesProps) {
  const analysis = analyzeSmartDeadlines(milestones, releaseDate);
  const overallRiskStyle = RISK_COLORS[analysis.overall_risk];
  const OverallRiskIcon = overallRiskStyle.icon;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getRiskBadge = (recommendation: DeadlineRecommendation) => {
    const riskStyle = RISK_COLORS[recommendation.risk_level];
    return (
      <Badge variant="outline" className={`${riskStyle.text} border-current`}>
        {recommendation.risk_level.toUpperCase()}
      </Badge>
    );
  };

  // Sort by recommended date (earliest first)
  const sortedRecommendations = [...analysis.recommendations].sort(
    (a, b) => a.recommended_date.getTime() - b.recommended_date.getTime()
  );

  return (
    <div className="space-y-6">
      {/* Overall Risk Summary */}
      <Alert className={`${overallRiskStyle.border} ${overallRiskStyle.bg}`}>
        <OverallRiskIcon className={`h-5 w-5 ${overallRiskStyle.text}`} />
        <AlertDescription className="ml-2">
          <div className="flex items-center justify-between">
            <div>
              <strong className={overallRiskStyle.text}>Timeline Risk: {analysis.overall_risk.toUpperCase()}</strong>
              {analysis.has_conflicts && (
                <p className="text-sm text-muted-foreground mt-1">
                  {analysis.conflict_count} milestone{analysis.conflict_count > 1 ? 's' : ''} past recommended deadline
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Release in</p>
              <p className="text-2xl font-bold">{analysis.total_days_to_release} days</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Timeline Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Smart Deadlines</CardTitle>
              <CardDescription>
                Industry-standard recommendations vs. your actual deadlines
              </CardDescription>
            </div>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedRecommendations.map((rec) => {
              const riskStyle = RISK_COLORS[rec.risk_level];
              const RiskIcon = riskStyle.icon;
              const isLate = rec.days_difference > 0;
              const isEarly = rec.days_difference < -7;

              return (
                <div
                  key={rec.milestone_id}
                  className={`relative rounded-lg border-l-4 ${riskStyle.border} ${riskStyle.bg} p-4`}
                >
                  {/* Critical badge */}
                  {rec.is_critical && (
                    <Badge
                      variant="destructive"
                      className="absolute top-2 right-2 text-xs"
                    >
                      CRITICAL
                    </Badge>
                  )}

                  <div className="space-y-3">
                    {/* Milestone name and risk */}
                    <div className="flex items-start justify-between pr-20">
                      <div>
                        <h4 className="font-semibold text-foreground">{rec.milestone_name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rec.buffer_days} day buffer recommended
                        </p>
                      </div>
                      {getRiskBadge(rec)}
                    </div>

                    {/* Date comparison */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Your Deadline</p>
                        <p className="font-medium text-foreground">{formatDate(rec.actual_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Recommended</p>
                        <p className={`font-medium ${isLate ? 'text-yellow-400' : 'text-green-400'}`}>
                          {formatDate(rec.recommended_date)}
                        </p>
                      </div>
                    </div>

                    {/* Timeline bar */}
                    <div className="relative">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        {isLate && (
                          <div
                            className={`h-full ${riskStyle.badge} transition-all`}
                            style={{ width: '100%' }}
                          />
                        )}
                        {!isLate && !isEarly && (
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: '100%' }}
                          />
                        )}
                        {isEarly && (
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: '100%' }}
                          />
                        )}
                      </div>

                      {/* Days difference indicator */}
                      <div className="flex items-center justify-between mt-1.5">
                        <RiskIcon className={`h-3 w-3 ${riskStyle.text}`} />
                        <span className={`text-xs ${riskStyle.text}`}>
                          {isLate ? `${rec.days_difference} days late` :
                           isEarly ? `${Math.abs(rec.days_difference)} days early` :
                           'On track'}
                        </span>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className={`text-sm ${riskStyle.text} bg-card/50 rounded px-3 py-2`}>
                      {rec.recommendation_reason}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Timeline Risk Levels:</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Safe (7+ days early)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs text-muted-foreground">Tight (On time)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-muted-foreground">Risky (Up to 7 days late)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs text-muted-foreground">Critical (7+ days late)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
