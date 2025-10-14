import type { Route } from "./+types/project.$id";
import { Link, useNavigation } from "react-router";
import { FileText, DollarSign, FolderOpen, Calendar as CalendarIcon, Share2, Music, GanttChart, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BackButton } from "~/components/BackButton";
import { MilestoneGantt } from "~/components/MilestoneGantt";
import { ContentQuotaWidget } from "~/components/widgets/ContentQuotaWidget";
import { DashboardSkeleton } from "~/components/skeletons/DashboardSkeleton";
import { ActionDashboard } from "~/components/ActionDashboard";
import { SmartDeadlines } from "~/components/SmartDeadlines";
import type { ProjectWithMilestones, Milestone } from "@/types";

export async function loader({ params, context }: Route.LoaderArgs): Promise<ProjectWithMilestones> {
  // Use direct DB access instead of HTTP fetch to avoid SSR issues
  const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

  // Import handler function
  const { getProjectDetails } = await import("../../workers/api-handlers/projects");
  const data = await getProjectDetails(env.env.DB, params.id);

  if (!data) {
    throw new Response("Project not found", { status: 404 });
  }

  return data as unknown as ProjectWithMilestones;
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `${data?.project.release_title} - ${data?.project.artist_name}` },
  ];
}

export default function ProjectDashboard({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();

  // Show skeleton during navigation
  if (navigation.state === "loading") {
    return <DashboardSkeleton />;
  }

  const { project, milestones, budget_summary, cleared_for_release } = loaderData;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getMilestoneStatusBadge = (milestone: Milestone) => {
    const now = new Date();
    const dueDate = new Date(milestone.due_date);

    if (milestone.status === 'complete') {
      return <Badge className="bg-primary text-primary-foreground">Complete</Badge>;
    }
    if (dueDate < now) {
      return <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>;
    }
    if (milestone.status === 'in_progress') {
      return <Badge className="bg-secondary text-secondary-foreground">In Progress</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const completedMilestones = milestones.filter((m: Milestone) => m.status === 'complete').length;
  const totalMilestones = milestones.length;
  const progress = (completedMilestones / totalMilestones) * 100;

  const budgetUsed = budget_summary?.total_spent || 0;
  const budgetRemaining = (project.total_budget || 0) - budgetUsed;
  const budgetProgress = ((budgetUsed / (project.total_budget || 1)) * 100);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <BackButton to="/" label="Back to Home" />
            <h1 className="text-4xl font-bold text-primary mb-2">
              {project.release_title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {project.artist_name} · {project.release_type}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Release Date</div>
              <div className="text-2xl font-semibold">{formatDate(project.release_date || '')}</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <Button asChild variant="outline" size="sm" className="glow-hover-sm">
                <Link to={`/project/${project.id}/content`} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Content
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="glow-hover-sm">
                <Link to={`/project/${project.id}/budget`} className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="glow-hover-sm">
                <Link to={`/project/${project.id}/files`} className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Files
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="glow-hover-sm">
                <Link to={`/project/${project.id}/calendar`} className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Calendar
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="glow-hover-sm">
                <Link to={`/project/${project.id}/social`} className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Social
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="glow-hover-sm">
                <Link to={`/project/${project.id}/master`} className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Master
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Action Dashboard */}
        <ActionDashboard projectId={project.id} />

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card elevation="raised" glow="primary" className="border-border bg-card">
            <CardHeader>
              <CardTitle>Project Progress</CardTitle>
              <CardDescription>{completedMilestones} of {totalMilestones} milestones complete</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={progress} className="h-3" />
                <div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
              </div>
            </CardContent>
          </Card>

          <Card elevation="raised" className="border-border bg-card">
            <CardHeader>
              <CardTitle>Budget</CardTitle>
              <CardDescription>Total allocated budget</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{formatCurrency(project.total_budget || 0)}</div>
                <Progress value={budgetProgress} className="h-3" />
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(budgetUsed)} spent · {formatCurrency(budgetRemaining)} remaining
                </div>
              </div>
            </CardContent>
          </Card>

          <Card elevation="floating" glow={cleared_for_release?.cleared ? "primary" : "none"} className={`border-2 ${cleared_for_release?.cleared ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5'}`}>
            <CardHeader>
              <CardTitle>Cleared for Release</CardTitle>
              <CardDescription>Release readiness status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge
                  variant={cleared_for_release?.cleared ? "default" : "destructive"}
                  className="text-lg px-4 py-2 flex items-center gap-2 w-fit"
                >
                  {cleared_for_release?.cleared ? (
                    <><CheckCircle className="h-5 w-5" /> CLEARED</>
                  ) : (
                    <><XCircle className="h-5 w-5" /> NOT CLEARED</>
                  )}
                </Badge>

                {cleared_for_release && !cleared_for_release.cleared && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-semibold">Missing Requirements:</p>
                    <ul className="text-xs space-y-1">
                      {cleared_for_release.reasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="text-muted-foreground">• {reason}</li>
                      ))}
                      {cleared_for_release.reasons.length > 3 && (
                        <li className="text-muted-foreground/70 italic">+ {cleared_for_release.reasons.length - 3} more...</li>
                      )}
                    </ul>
                  </div>
                )}

                {cleared_for_release?.cleared && (
                  <p className="text-sm font-medium">
                    All requirements met - ready for distribution!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Quota Widget */}
          <ContentQuotaWidget milestones={milestones} projectId={project.id} />
        </div>

        {/* Timeline Insights Panel */}
        <Card elevation="raised" glow="primary" className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Critical Path</div>
                <div className="text-2xl font-bold text-primary">
                  {milestones.filter((m: Milestone) => m.blocks_release === 1 && m.status !== 'complete').length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Blocking milestones remaining
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Time to Release</div>
                <div className="text-2xl font-bold">
                  {Math.ceil((new Date(project.release_date || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {(() => {
                    const overdueMilestones = milestones.filter((m: Milestone) => {
                      const dueDate = new Date(m.due_date);
                      const now = new Date();
                      return dueDate < now && m.status !== 'complete';
                    });
                    return overdueMilestones.length === 0 ? (
                      <><CheckCircle className="h-3 w-3" /> On track</>
                    ) : (
                      <><AlertTriangle className="h-3 w-3 text-yellow-500" /> {overdueMilestones.length} overdue</>
                    );
                  })()}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Next Deadline</div>
                <div className="text-2xl font-bold text-yellow-500">
                  {(() => {
                    const nextMilestone = milestones
                      .filter((m: Milestone) => m.status !== 'complete')
                      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
                    return nextMilestone ? formatDate(nextMilestone.due_date) : 'None';
                  })()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const nextMilestone = milestones
                      .filter((m: Milestone) => m.status !== 'complete')
                      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
                    return nextMilestone ? nextMilestone.name : 'All complete';
                  })()}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Overall Progress</div>
                <div className="text-2xl font-bold text-primary">
                  {Math.round(progress)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {completedMilestones} of {totalMilestones} milestones
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        <MilestoneGantt
          milestones={milestones}
          releaseDate={project.release_date || ''}
          projectStartDate={project.created_at}
        />

        {/* Smart Deadlines */}
        <SmartDeadlines
          milestones={milestones}
          releaseDate={project.release_date || ''}
          projectId={project.id}
        />
      </div>
    </div>
  );
}
