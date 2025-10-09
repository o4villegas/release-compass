import type { Route } from "./+types/project.$id.content";
import { useLoaderData, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { BackButton } from '~/components/BackButton';
import { ContentUpload } from '~/components/ContentUpload';
import { EmptyState } from '~/components/ui/empty-state';

type ContentItem = {
  id: string;
  content_type: string;
  capture_context: string;
  storage_key: string;
  caption_draft: string | null;
  intended_platforms: string | null;
  created_at: string;
  milestone_id: string | null;
};

type Milestone = {
  id: string;
  title: string;
  status: string;
  due_date: string;
};

type QuotaRequirement = {
  content_type: string;
  required: number;
  actual: number;
  missing: number;
  met: boolean;
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const { id } = params;
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api`;

  // Fetch project details
  const projectRes = await fetch(`${apiUrl}/projects/${id}`);
  if (!projectRes.ok) throw new Error('Failed to fetch project');
  const projectData = await projectRes.json() as {
    project: any;
    milestones: Milestone[];
  };

  // Fetch all content for this project
  const contentRes = await fetch(`${apiUrl}/projects/${id}/content`);
  if (!contentRes.ok) throw new Error('Failed to fetch content');
  const contentData = await contentRes.json() as {
    content_items: ContentItem[];
  };

  // Fetch quota status for each milestone
  const milestonesWithQuota = await Promise.all(
    projectData.milestones.map(async (milestone: Milestone) => {
      const quotaRes = await fetch(`${apiUrl}/milestones/${milestone.id}/content-status`);
      const quotaData = await quotaRes.json();
      return {
        ...milestone,
        quota_status: quotaData,
      };
    })
  );

  return {
    project: projectData.project,
    milestones: milestonesWithQuota,
    contentItems: contentData.content_items as ContentItem[],
  };
}

export default function ProjectContent() {
  const { project, milestones, contentItems } = useLoaderData<typeof loader>();

  // Group content by milestone
  const contentByMilestone = contentItems.reduce((acc, item) => {
    const key = item.milestone_id || 'unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ContentItem[]>);

  // Calculate overall content stats
  const totalContent = contentItems.length;
  const photoCount = contentItems.filter((c) => c.content_type === 'photo').length;
  const videoCount = contentItems.filter((c) => c.content_type.includes('video')).length;
  const audioCount = contentItems.filter((c) => c.content_type === 'voice_memo').length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <BackButton to={`/project/${project.id}`} label="Back to Project" />
        <h1 className="text-4xl font-bold mt-2">{project.release_title}</h1>
        <p className="text-muted-foreground">{project.artist_name}</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalContent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{photoCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{videoCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Audio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{audioCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload Content</TabsTrigger>
          <TabsTrigger value="library">Content Library</TabsTrigger>
          <TabsTrigger value="milestones">By Milestone</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-6">
          <ContentUpload
            projectId={project.id}
            onUploadComplete={() => window.location.reload()}
          />
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Content</CardTitle>
              <CardDescription>
                {contentItems.length} items uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentItems.length === 0 ? (
                  <EmptyState
                    icon={<span className="text-5xl">📸</span>}
                    title="No Content Yet"
                    description="Start building your content library by uploading photos, videos, and audio from your creative sessions. Switch to the Upload tab to get started."
                    action={{
                      label: "Go to Upload Tab",
                      to: `#upload`
                    }}
                  />
                ) : (
                  contentItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-4 border border-border rounded-lg hover:border-primary transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {item.content_type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary">
                            {item.capture_context.replace('_', ' ')}
                          </Badge>
                        </div>
                        {item.caption_draft && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {item.caption_draft}
                          </p>
                        )}
                        {item.intended_platforms && (
                          <p className="text-xs text-muted-foreground">
                            Platforms: {item.intended_platforms}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/files/${item.storage_key}`} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="mt-6 space-y-6">
          {milestones.map((milestone: any) => {
            const milestoneContent = contentByMilestone[milestone.id] || [];
            const quotaStatus = milestone.quota_status;

            return (
              <Card key={milestone.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {milestone.name}
                        <Badge
                          variant={milestone.status === 'complete' ? 'default' : 'secondary'}
                        >
                          {milestone.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Due: {new Date(milestone.due_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/milestone/${milestone.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quota Progress */}
                  {quotaStatus && quotaStatus.requirements.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Content Requirements</h4>
                        <Badge variant={quotaStatus.quota_met ? 'default' : 'secondary'}>
                          {quotaStatus.quota_met ? '✓ Complete' : 'In Progress'}
                        </Badge>
                      </div>
                      {quotaStatus.requirements.map((req: QuotaRequirement) => (
                        <div key={req.content_type} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize">
                              {req.content_type.replace('_', ' ')}
                            </span>
                            <span className={req.met ? 'text-primary' : 'text-muted-foreground'}>
                              {req.actual} / {req.required}
                            </span>
                          </div>
                          <Progress value={(req.actual / req.required) * 100} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content Items */}
                  {milestoneContent.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        Uploaded Content ({milestoneContent.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {milestoneContent.map((item) => (
                          <Badge key={item.id} variant="outline">
                            {item.content_type.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
