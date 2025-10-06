import { json, type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Alert } from '~/components/ui/alert';
import { ContentUpload } from '~/components/ContentUpload';

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

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api`;

  // Fetch milestone details with content requirements
  const milestoneRes = await fetch(`${apiUrl}/milestones/${id}`);
  if (!milestoneRes.ok) throw new Error('Failed to fetch milestone');
  const milestoneData = await milestoneRes.json();

  // Fetch project details
  const projectRes = await fetch(`${apiUrl}/projects/${milestoneData.milestone.project_id}`);
  if (!projectRes.ok) throw new Error('Failed to fetch project');
  const projectData = await projectRes.json();

  return json({
    milestone: milestoneData.milestone,
    contentRequirements: milestoneData.content_requirements,
    quotaStatus: milestoneData.quota_status as QuotaStatus,
    project: projectData.project,
  });
}

export default function MilestoneDetail() {
  const { milestone, contentRequirements, quotaStatus, project } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    setError('');

    try {
      // Get user UUID from localStorage
      const userUuid = localStorage.getItem('user_uuid') || crypto.randomUUID();
      localStorage.setItem('user_uuid', userUuid);

      const response = await fetch(`/api/milestones/${milestone.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_uuid: userUuid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'QUOTA_NOT_MET') {
          // Show detailed quota error
          const unmetRequirements = errorData.quota_status.requirements
            .filter((r: QuotaRequirement) => !r.met)
            .map((r: QuotaRequirement) => `${r.content_type.replace('_', ' ')}: ${r.missing} more needed`)
            .join(', ');
          throw new Error(`Cannot complete milestone: ${unmetRequirements}`);
        } else if (errorData.error === 'NOTES_NOT_ACKNOWLEDGED') {
          throw new Error(`Cannot complete milestone: Master file has ${errorData.file_id ? 'unacknowledged' : ''} feedback notes that must be acknowledged first. Go to Production Files to review and acknowledge.`);
        } else if (errorData.error === 'TEASER_REQUIREMENT_NOT_MET') {
          const status = errorData.teaser_status;
          throw new Error(`Cannot complete milestone: Need ${status.missing} more teaser post${status.missing > 1 ? 's' : ''} (${status.actual}/${status.required} posted)`);
        }
        throw new Error(errorData.message || 'Failed to complete milestone');
      }

      // Success - redirect to project page
      navigate(`/project/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete milestone');
    } finally {
      setCompleting(false);
    }
  };

  const daysUntilDue = Math.ceil(
    (new Date(milestone.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const isOverdue = daysUntilDue < 0 && milestone.status !== 'complete';
  const isComplete = milestone.status === 'complete';

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <Link to={`/project/${project.id}`} className="text-sm text-muted-foreground hover:text-primary">
          ← Back to Project
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-4xl font-bold">{milestone.name}</h1>
            <p className="text-muted-foreground mt-1">
              {project.artist_name} - {project.release_title}
            </p>
          </div>
          <Badge
            variant={
              isComplete ? 'default' : isOverdue ? 'destructive' : 'secondary'
            }
            className="text-lg px-4 py-2"
          >
            {isComplete ? 'Complete' : isOverdue ? 'Overdue' : 'In Progress'}
          </Badge>
        </div>
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Due Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(milestone.due_date).toLocaleDateString()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {daysUntilDue > 0 ? `${daysUntilDue} days remaining` : `${Math.abs(daysUntilDue)} days overdue`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quota Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${quotaStatus.quota_met ? 'text-primary' : 'text-muted-foreground'}`}>
              {quotaStatus.quota_met ? '✓ Met' : 'Not Met'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {quotaStatus.requirements.filter((r) => r.met).length} / {quotaStatus.requirements.length} requirements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Content Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quotaStatus.requirements.reduce((sum, r) => sum + r.actual, 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {quotaStatus.requirements.reduce((sum, r) => sum + r.required, 0)} required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Content Requirements</CardTitle>
          <CardDescription>
            {quotaStatus.quota_met
              ? 'All content requirements have been met. You can mark this milestone as complete.'
              : 'Upload the required content to unlock milestone completion.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quotaStatus.requirements.map((req) => (
            <div key={req.content_type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">
                    {req.content_type.replace('_', ' ')}
                  </span>
                  {req.met && (
                    <Badge variant="default" className="text-xs">
                      ✓ Complete
                    </Badge>
                  )}
                </div>
                <span className={req.met ? 'text-primary font-bold' : 'text-muted-foreground'}>
                  {req.actual} / {req.required}
                  {!req.met && ` (${req.missing} more needed)`}
                </span>
              </div>
              <Progress value={(req.actual / req.required) * 100} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upload Content Section */}
      {!isComplete && (
        <div>
          <Button
            variant="outline"
            onClick={() => setShowUpload(!showUpload)}
            className="mb-4"
          >
            {showUpload ? 'Hide Upload Form' : 'Upload Content for This Milestone'}
          </Button>
          {showUpload && (
            <ContentUpload
              projectId={project.id}
              milestoneId={milestone.id}
              onUploadComplete={() => window.location.reload()}
            />
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive text-destructive">
          {error}
        </Alert>
      )}

      {/* Mark Complete Button */}
      {!isComplete && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Mark Milestone as Complete</CardTitle>
            <CardDescription>
              {quotaStatus.quota_met
                ? 'All requirements are met. You can now complete this milestone.'
                : 'You must meet all content requirements before completing this milestone.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              onClick={handleComplete}
              disabled={!quotaStatus.quota_met || completing}
              className="w-full"
            >
              {completing ? 'Completing...' : 'Mark as Complete'}
            </Button>
            {!quotaStatus.quota_met && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                This is the breakthrough feature: You cannot complete milestones without capturing the required content.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed Info */}
      {isComplete && milestone.completed_at && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary">✓</span> Milestone Complete
            </CardTitle>
            <CardDescription>
              Completed on {new Date(milestone.completed_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
