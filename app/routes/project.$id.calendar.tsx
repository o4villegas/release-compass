import type { Route } from "./+types/project.$id.calendar";
import { useLoaderData } from 'react-router';
import { BackButton } from '~/components/BackButton';
import { ContentCalendar } from '~/components/ContentCalendar';

type ScheduledContent = {
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
};

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
  name: string;
  due_date: string;
  status: string;
};

type Project = {
  id: string;
  artist_name: string;
  release_title: string;
  release_date: string;
};

type CalendarLoaderData = {
  project: Project;
  milestones: Milestone[];
  scheduledContent: ScheduledContent[];
  availableContent: ContentItem[];
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

  // Get scheduled content
  const { getContentSchedule } = await import("../../workers/api-handlers/calendar");
  const scheduleData = await getContentSchedule(env.env.DB, id);

  // Get all content items
  const contentResult = await env.env.DB.prepare(`
    SELECT id, content_type, capture_context, storage_key, caption_draft,
           intended_platforms, created_at, milestone_id
    FROM content_items
    WHERE project_id = ?
    ORDER BY created_at DESC
  `).bind(id).all();

  // Map milestones to only include required fields for calendar
  const calendarMilestones = projectData.milestones.map((m: any) => ({
    id: m.id,
    name: m.name,
    due_date: m.due_date,
    status: m.status
  }));

  return {
    project: projectData.project as Project,
    milestones: calendarMilestones as Milestone[],
    scheduledContent: (scheduleData.scheduled_content || []) as ScheduledContent[],
    availableContent: (contentResult.results || []) as ContentItem[],
  } as CalendarLoaderData;
}

export default function ProjectCalendar() {
  const { project, milestones, scheduledContent, availableContent } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <BackButton to={`/project/${project.id}`} label="Back to Project" />
        <h1 className="text-4xl font-bold mt-2">Content Calendar</h1>
        <p className="text-muted-foreground">
          {project.release_title} by {project.artist_name}
        </p>
      </div>

      {/* Calendar Component */}
      <ContentCalendar
        projectId={project.id}
        releaseDate={project.release_date}
        scheduledContent={scheduledContent}
        milestones={milestones}
        availableContent={availableContent}
      />
    </div>
  );
}
