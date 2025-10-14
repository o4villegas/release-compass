import { useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/project.$id.timeline";
import { BackButton } from "~/components/BackButton";
import { EmptyState } from "~/components/ui/empty-state";
import { GanttChart } from "lucide-react";
import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureRow,
  GanttToday,
  type GanttFeature,
} from "~/components/ui/gantt";
import { useState } from "react";

// Milestone data type from API
type Milestone = {
  id: string;
  name: string;
  status: string;
  due_date: string;
  start_date: string;
  quota_status?: {
    quota_met: boolean;
    requirements: Array<{
      content_type: string;
      required: number;
      actual: number;
      missing: number;
      met: boolean;
    }>;
  };
};

type ProjectData = {
  project: {
    id: string;
    artist_name: string;
    release_title: string;
    release_date: string;
  };
  milestones: Milestone[];
};

// Loader function to fetch project data
export async function loader({ params, context }: Route.LoaderArgs) {
  const { id } = params;

  // Use direct DB access instead of HTTP fetch to avoid SSR issues
  const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

  // Import handler function
  const { getProjectDetails } = await import("../../workers/api-handlers/projects");
  const data = await getProjectDetails(env.env.DB, id);

  if (!data) {
    throw new Response("Project not found", { status: 404 });
  }

  return {
    project: data.project,
    milestones: data.milestones || [],
  };
}

// Convert milestone to GanttFeature with quota-based color
function milestoneToGanttFeature(milestone: Milestone): GanttFeature {
  const quotaMet = milestone.quota_status?.quota_met ?? true;
  const quotaPercent = milestone.quota_status?.requirements.length
    ? milestone.quota_status.requirements.reduce((sum, req) => {
        const percent = (req.actual / req.required) * 100;
        return sum + percent;
      }, 0) / milestone.quota_status.requirements.length
    : 100;

  // Color based on quota status
  let color = "#10b981"; // green - quota met
  if (!quotaMet) {
    if (quotaPercent < 50) {
      color = "#ef4444"; // red - far from quota
    } else {
      color = "#f59e0b"; // yellow - partial quota
    }
  }

  // Parse dates with fallback to today if invalid
  const now = new Date();
  const startDate = milestone.start_date ? new Date(milestone.start_date) : now;
  const dueDate = milestone.due_date ? new Date(milestone.due_date) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Validate parsed dates
  const startAt = isNaN(startDate.getTime()) ? now : startDate;
  const endAt = isNaN(dueDate.getTime()) ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : dueDate;

  return {
    id: milestone.id,
    name: milestone.name,
    startAt,
    endAt,
    status: {
      id: milestone.status,
      name: milestone.status,
      color,
    },
    lane: undefined, // Can group milestones by phase later
  };
}

// Calculate quota percentage for progress bar
function getQuotaPercent(milestone: Milestone): number {
  if (!milestone.quota_status?.requirements.length) return 100;

  const totalPercent = milestone.quota_status.requirements.reduce((sum, req) => {
    const percent = Math.min(100, (req.actual / req.required) * 100);
    return sum + percent;
  }, 0);

  return Math.round(totalPercent / milestone.quota_status.requirements.length);
}

export default function ProjectTimeline({ loaderData }: Route.ComponentProps) {
  const { project, milestones } = loaderData;
  const navigation = useNavigation();

  // Show loading skeleton during navigation
  if (navigation.state === "loading") {
    return (
      <div className="flex h-screen flex-col">
        <div className="border-b p-4 animate-pulse">
          <div className="h-6 w-32 bg-muted rounded mb-3"></div>
          <div className="h-8 w-64 bg-muted rounded mb-2"></div>
          <div className="h-4 w-48 bg-muted rounded"></div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="h-12 bg-muted rounded animate-pulse"></div>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
          <div className="h-32 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Convert milestones to Gantt features (using initializer for SSR compatibility)
  // Initializer function runs during both SSR and client hydration, ensuring
  // the same features array is available on first render (no hydration mismatch)
  const [ganttFeatures] = useState<GanttFeature[]>(() =>
    (milestones as unknown as Milestone[]).map(milestoneToGanttFeature)
  );

  // Handle empty state
  if (milestones.length === 0) {
    return (
      <div className="flex h-screen flex-col">
        <div className="border-b p-4">
          <BackButton to={`/project/${project.id}`} label="Back to Dashboard" />
          <h1 className="text-2xl font-bold">
            {project.release_title} - Timeline
          </h1>
        </div>
        <EmptyState
          icon={<GanttChart className="h-12 w-12" />}
          title="No Milestones Yet"
          description="This project doesn't have any milestones to display on the timeline. Milestones are automatically generated when you create a project with a release date."
          action={{
            label: "Back to Dashboard",
            to: `/project/${project.id}`
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <BackButton to={`/project/${project.id}`} label="Back to Dashboard" />
        <h1 className="text-2xl font-bold">
          {project.release_title} - Timeline
        </h1>
        <p className="text-sm text-muted-foreground">
          {project.artist_name} • Release: {project.release_date ? new Date(project.release_date).toLocaleDateString() : 'TBD'}
        </p>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-hidden p-4">
        <GanttProvider range="monthly" zoom={100}>
          <GanttSidebar>
            <GanttSidebarGroup name="Production Milestones (Read-Only)">
              {ganttFeatures.map((feature) => (
                <GanttSidebarItem
                  key={feature.id}
                  feature={feature}
                  onSelectItem={() => {}}
                />
              ))}
            </GanttSidebarGroup>
          </GanttSidebar>

          <GanttTimeline>
            <GanttHeader />
            <GanttFeatureList>
              <GanttFeatureListGroup>
                <GanttFeatureRow
                  features={ganttFeatures}
                  onMove={undefined}
                >
                  {(feature) => {
                    // Find original milestone for quota data
                    const milestone = (milestones as unknown as Milestone[]).find((m: Milestone) => m.id === feature.id);
                    const quotaPercent = milestone ? getQuotaPercent(milestone) : 100;
                    const quotaMet = milestone?.quota_status?.quota_met ?? true;

                    return (
                      <div className="flex w-full items-center gap-2">
                        <p className="flex-1 truncate text-xs font-medium">
                          {feature.name}
                        </p>
                        {/* Quota progress bar */}
                        <div className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${
                              quotaMet
                                ? "bg-green-500"
                                : quotaPercent < 50
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }`}
                            style={{ width: `${quotaPercent}%` }}
                          />
                        </div>
                        {/* Quota percentage label */}
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {quotaPercent}%
                        </span>
                      </div>
                    );
                  }}
                </GanttFeatureRow>
              </GanttFeatureListGroup>
            </GanttFeatureList>
            <GanttToday />
          </GanttTimeline>
        </GanttProvider>
      </div>

      {/* Legend */}
      <div className="border-t p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Quota Met (100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span>Partial (50-99%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Critical (&lt;50%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
