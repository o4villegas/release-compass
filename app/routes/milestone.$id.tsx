import type { Route } from "./+types/milestone.$id";
import { useLoaderData, Link, useNavigate, useRevalidator } from 'react-router';
import { useState } from 'react';
import { CheckCircle, Calendar, Upload, ListChecks } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Alert } from '~/components/ui/alert';
import { BackButton } from '~/components/BackButton';
import { ContentUpload } from '~/components/ContentUpload';
import { ContentSuggestions } from '~/components/ContentSuggestions';
import { QuotaNotMetModal } from '~/components/modals/QuotaNotMetModal';
import { NotesNotAcknowledgedModal } from '~/components/modals/NotesNotAcknowledgedModal';
import { TeaserRequirementModal } from '~/components/modals/TeaserRequirementModal';

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

export async function loader({ params, context }: Route.LoaderArgs) {
  // Use direct DB access instead of HTTP fetch to avoid SSR issues
  const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

  // Import handler functions
  const { getMilestoneDetails } = await import("../../workers/api-handlers/milestones");
  const { getProjectDetails } = await import("../../workers/api-handlers/projects");

  const milestoneData = await getMilestoneDetails(env.env.DB, params.id);

  if (!milestoneData) {
    throw new Response("Milestone not found", { status: 404 });
  }

  // Fetch project details
  const projectData = await getProjectDetails(env.env.DB, milestoneData.milestone.project_id as string);

  if (!projectData) {
    throw new Response("Project not found", { status: 404 });
  }

  // Fetch already captured content for this milestone (for suggestions filtering)
  const capturedContent = await env.env.DB.prepare(`
    SELECT content_type, capture_context
    FROM content_items
    WHERE milestone_id = ?
  `).bind(params.id).all();

  const alreadyCaptured = capturedContent.results.map((row: any) => ({
    content_type: row.content_type,
    capture_context: row.capture_context
  }));

  return {
    milestone: milestoneData.milestone,
    contentRequirements: milestoneData.content_requirements,
    quotaStatus: milestoneData.quota_status as QuotaStatus,
    project: projectData.project,
    alreadyCaptured,
  };
}

export default function MilestoneDetail() {
  const { milestone, contentRequirements, quotaStatus, project, alreadyCaptured } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [prefilledContentType, setPrefilledContentType] = useState<string | undefined>(undefined);
  const [prefilledCaptureContext, setPrefilledCaptureContext] = useState<string | undefined>(undefined);

  // Modal state
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [teaserModalOpen, setTeaserModalOpen] = useState(false);
  const [errorData, setErrorData] = useState<any>(null);

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
        const data = await response.json() as {
          error?: string;
          message?: string;
          quota_status?: { requirements: QuotaRequirement[] };
          file_id?: string;
          teaser_status?: { missing: number; actual: number; required: number };
        };
        setErrorData(data);

        if (data.error === 'QUOTA_NOT_MET') {
          setQuotaModalOpen(true);
          setCompleting(false);
          return;
        } else if (data.error === 'NOTES_NOT_ACKNOWLEDGED') {
          setNotesModalOpen(true);
          setCompleting(false);
          return;
        } else if (data.error === 'TEASER_REQUIREMENT_NOT_MET') {
          setTeaserModalOpen(true);
          setCompleting(false);
          return;
        }
        throw new Error(data.message || 'Failed to complete milestone');
      }

      // Success - redirect to project page
      navigate(`/project/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete milestone');
    } finally {
      setCompleting(false);
    }
  };

  const handleCaptureNow = (contentType: string, captureContext: string) => {
    // Pre-fill the upload form with suggested content type and context
    setPrefilledContentType(contentType);
    setPrefilledCaptureContext(captureContext);
    setShowUpload(true);
    // Scroll to upload form
    setTimeout(() => {
      const uploadSection = document.getElementById('upload-section');
      uploadSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const daysUntilDue = Math.ceil(
    (new Date(milestone.due_date || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const isOverdue = daysUntilDue < 0 && milestone.status !== 'complete';
  const isComplete = milestone.status === 'complete';

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="animate-scale-in">
        <BackButton to={`/project/${project.id}`} label="Back to Project" />
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

      {/* Two-Column Layout: Main Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">

          {/* Content Requirements */}
          <Card elevation="raised" glow="primary" className="animate-slide-in-left">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 glow-sm">
                  <ListChecks className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Content Requirements</CardTitle>
                  <CardDescription>
                    {quotaStatus.requirements.filter((r) => r.met).length} of {quotaStatus.requirements.length} requirements met · {' '}
                    {quotaStatus.requirements.reduce((sum, r) => sum + r.actual, 0)} of {quotaStatus.requirements.reduce((sum, r) => sum + r.required, 0)} items captured
                  </CardDescription>
                </div>
              </div>
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
                        <Badge variant="default" className="text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Complete
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

          {/* Smart Content Suggestions */}
          {!isComplete && (
            <ContentSuggestions
              milestoneName={milestone.name || ''}
              alreadyCaptured={alreadyCaptured}
              onCaptureNow={handleCaptureNow}
            />
          )}

          {/* Upload Content Section */}
          {!isComplete && (
            <Card elevation="raised" id="upload-section">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 glow-sm">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>Upload Content</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => setShowUpload(!showUpload)}
                  className="mb-4 w-full"
                >
                  {showUpload ? 'Hide Upload Form' : 'Upload Content for This Milestone'}
                </Button>
                {showUpload && (
                  <ContentUpload
                    projectId={project.id || ''}
                    milestoneId={milestone.id || ''}
                    onUploadComplete={() => revalidator.revalidate()}
                    prefilledContentType={prefilledContentType as any}
                    prefilledCaptureContext={prefilledCaptureContext}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-destructive text-destructive">
              {error}
            </Alert>
          )}

          {/* Mark Complete Button */}
          {!isComplete && (
            <Card elevation="floating" glow="primary" className="border-primary">
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
                  className="w-full glow-hover-md"
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
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto space-y-6">
            {/* Due Date Card */}
            <Card elevation="floating" glow="secondary" className="animate-slide-in-right">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20 glow-secondary-sm">
                    <Calendar className="h-5 w-5 text-secondary" />
                  </div>
                  <CardTitle className="text-sm font-medium">Due Date</CardTitle>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-2xl font-bold">
                      {new Date(milestone.due_date || '').toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {daysUntilDue > 0 ? `${daysUntilDue} days remaining` : `${Math.abs(daysUntilDue)} days overdue`}
                    </p>
                  </div>
                  <Badge
                    variant={quotaStatus.quota_met ? "default" : "outline"}
                    className="text-sm px-3 py-1 flex items-center gap-1"
                  >
                    {quotaStatus.quota_met && <CheckCircle className="h-3 w-3" />}
                    {quotaStatus.quota_met ? 'Quota Met' : 'Quota Not Met'}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Completed Info */}
            {isComplete && milestone.completed_at && (
              <Card elevation="floating" glow="primary" className="border-primary bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Milestone Complete
                  </CardTitle>
                  <CardDescription>
                    Completed on {new Date(milestone.completed_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Error Modals */}
      <QuotaNotMetModal
        open={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        requirements={errorData?.quota_status?.requirements || []}
        projectId={project.id || ''}
      />

      <NotesNotAcknowledgedModal
        open={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        fileId={errorData?.file_id || ''}
        projectId={project.id || ''}
      />

      <TeaserRequirementModal
        open={teaserModalOpen}
        onClose={() => setTeaserModalOpen(false)}
        required={errorData?.teaser_status?.required || 2}
        actual={errorData?.teaser_status?.actual || 0}
        missing={errorData?.teaser_status?.missing || 2}
        projectId={project.id || ''}
      />
    </div>
  );
}
