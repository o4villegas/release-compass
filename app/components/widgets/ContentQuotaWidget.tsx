import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";

type QuotaRequirement = {
  content_type: string;
  required: number;
  actual: number;
  missing: number;
  met: boolean;
};

type QuotaStatus = {
  quota_met: boolean;
  requirements: QuotaRequirement[];
  message: string;
};

type Milestone = {
  id: string;
  name: string;
  status: string;
  quota_status: QuotaStatus;
};

type ContentQuotaWidgetProps = {
  milestones: Milestone[];
  projectId: string;
};

export function ContentQuotaWidget({ milestones, projectId }: ContentQuotaWidgetProps) {
  // Get active milestones with content requirements
  const activeMilestonesWithQuota = milestones.filter(
    m => m.status !== 'complete' && m.quota_status.requirements.length > 0
  );

  if (activeMilestonesWithQuota.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Content Quotas</CardTitle>
          <CardDescription>No active content requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All milestones either complete or have no content requirements.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get next milestone with unmet quota
  const nextUnmetMilestone = activeMilestonesWithQuota.find(m => !m.quota_status.quota_met);

  // Calculate overall progress
  const totalRequirements = activeMilestonesWithQuota.reduce(
    (sum, m) => sum + m.quota_status.requirements.length,
    0
  );
  const metRequirements = activeMilestonesWithQuota.reduce(
    (sum, m) => sum + m.quota_status.requirements.filter(r => r.met).length,
    0
  );
  const overallProgress = totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 100;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Content Quotas</CardTitle>
            <CardDescription>
              {metRequirements} of {totalRequirements} requirements met
            </CardDescription>
          </div>
          <Badge variant={overallProgress === 100 ? "default" : "secondary"}>
            {Math.round(overallProgress)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={overallProgress} className="h-3" />

        {nextUnmetMilestone && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-yellow-800">
                Next: {nextUnmetMilestone.name}
              </span>
            </div>
            <div className="space-y-1">
              {nextUnmetMilestone.quota_status.requirements
                .filter(r => !r.met)
                .slice(0, 3)
                .map(req => (
                  <div key={req.content_type} className="text-xs text-yellow-700">
                    • {req.content_type.replace('_', ' ')}: {req.missing} more needed
                  </div>
                ))}
            </div>
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to={`/project/${projectId}/content`}>
            Upload Content
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
