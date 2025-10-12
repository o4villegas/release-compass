import type { Route } from "./+types/project.$id.content";
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { useState } from 'react';
import { useLoaderData, Link, useRevalidator } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { BackButton } from '~/components/BackButton';
import { ContentUpload } from '~/components/ContentUpload';
import { ContentLightbox } from '~/components/ContentLightbox';
import { EmptyState } from '~/components/ui/empty-state';
import { Camera, Video, Mic, Drama, Folder, CheckCircle } from 'lucide-react';

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

export async function loader({ params, context }: Route.LoaderArgs) {
  const { id } = params;

  // Use direct DB access instead of HTTP fetch to avoid SSR issues
  const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

  // Get project details
  const { getProjectDetails } = await import("../../workers/api-handlers/projects");
  const projectData = await getProjectDetails(env.env.DB, id);

  if (!projectData) {
    throw new Response("Project not found", { status: 404 });
  }

  // Get all content items for this project
  const contentResult = await env.env.DB.prepare(`
    SELECT id, content_type, capture_context, storage_key, caption_draft,
           intended_platforms, created_at, milestone_id
    FROM content_items
    WHERE project_id = ?
    ORDER BY created_at DESC
  `).bind(id).all();

  // Get quota status for each milestone
  const milestonesWithQuota = await Promise.all(
    projectData.milestones.map(async (milestone: any) => {
      // Get requirements
      const requirements = await env.env.DB.prepare(`
        SELECT content_type, minimum_count
        FROM milestone_content_requirements
        WHERE milestone_id = ?
      `).bind(milestone.id).all();

      if (requirements.results.length === 0) {
        return {
          ...milestone,
          quota_status: {
            quota_met: true,
            requirements: [],
            message: 'No content requirements for this milestone',
          },
        };
      }

      // Get actual counts
      const details = [];
      let allMet = true;

      for (const req of requirements.results) {
        const row = req as { content_type: string; minimum_count: number };

        const countResult = await env.env.DB.prepare(`
          SELECT COUNT(*) as count
          FROM content_items
          WHERE milestone_id = ? AND content_type = ?
        `).bind(milestone.id, row.content_type).first();

        const actual = (countResult?.count as number) || 0;
        const required = row.minimum_count;
        const missing = Math.max(0, required - actual);

        if (actual < required) {
          allMet = false;
        }

        details.push({
          content_type: row.content_type,
          required,
          actual,
          missing,
          met: actual >= required,
        });
      }

      return {
        ...milestone,
        quota_status: {
          quota_met: allMet,
          requirements: details,
          message: allMet ? 'All content requirements met' : 'Content quota not met',
        },
      };
    })
  );

  return {
    project: projectData.project as any,
    milestones: milestonesWithQuota,
    contentItems: contentResult.results as ContentItem[],
  };
}

export default function ProjectContent() {
  const { project, milestones, contentItems } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
            onUploadComplete={() => revalidator.revalidate()}
          />
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Content</CardTitle>
              <CardDescription>
                {contentItems.length} items uploaded • Click any item to preview
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contentItems.length === 0 ? (
                <EmptyState
                  icon={<Camera className="h-16 w-16 text-muted-foreground" />}
                  title="No Content Yet"
                  description="Start building your content library by uploading photos, videos, and audio from your creative sessions. Switch to the Upload tab to get started."
                  action={{
                    label: "Go to Upload Tab",
                    to: `#upload`
                  }}
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {contentItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="group relative aspect-square rounded-lg overflow-hidden border-2 border-border cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                      onClick={() => {
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                    >
                      {/* Thumbnail placeholder with icon */}
                      <div className="w-full h-full bg-gradient-to-br from-card to-muted flex items-center justify-center">
                        {item.content_type === 'photo' ? <Camera className="h-16 w-16 text-muted-foreground" /> :
                         item.content_type.includes('video') ? <Video className="h-16 w-16 text-muted-foreground" /> :
                         item.content_type === 'voice_memo' ? <Mic className="h-16 w-16 text-muted-foreground" /> :
                         item.content_type === 'live_performance' ? <Drama className="h-16 w-16 text-muted-foreground" /> :
                         <Folder className="h-16 w-16 text-muted-foreground" />}
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                        <span className="text-white font-semibold text-sm">Click to Preview</span>
                        <div className="flex gap-1">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Content type badge */}
                      <Badge
                        variant="secondary"
                        className="absolute top-2 left-2 text-xs capitalize shadow-md"
                      >
                        {item.content_type.replace('_', ' ')}
                      </Badge>

                      {/* Date badge */}
                      <Badge
                        variant="outline"
                        className="absolute bottom-2 right-2 text-[10px] bg-background/80 backdrop-blur"
                      >
                        {new Date(item.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
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
                        <Badge variant={quotaStatus.quota_met ? 'default' : 'secondary'} className="flex items-center gap-1">
                          {quotaStatus.quota_met ? <><CheckCircle className="h-3 w-3" /> Complete</> : 'In Progress'}
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

      {/* Content Lightbox */}
      <ContentLightbox
        allContent={contentItems}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}
