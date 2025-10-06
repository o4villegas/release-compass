import type { Route } from "./+types/project.$id";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { ProjectWithMilestones, Milestone } from "@/types";

export async function loader({ params, request }: Route.LoaderArgs) {
  // Use the request URL to build the API URL (works in both dev and production)
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api/projects/${params.id}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Response("Project not found", { status: 404 });
  }

  const data: ProjectWithMilestones = await response.json();
  return data;
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `${data.project.release_title} - ${data.project.artist_name}` },
  ];
}

export default function ProjectDashboard({ loaderData }: Route.ComponentProps) {
  const { project, milestones, budget_summary } = loaderData;

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
  const budgetRemaining = project.total_budget - budgetUsed;
  const budgetProgress = (budgetUsed / project.total_budget) * 100;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-primary mb-2">
              {project.release_title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {project.artist_name} · {project.release_type}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">Release Date</div>
            <div className="text-2xl font-semibold">{formatDate(project.release_date)}</div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border bg-card">
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

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Budget</CardTitle>
              <CardDescription>Total allocated budget</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{formatCurrency(project.total_budget)}</div>
                <Progress value={budgetProgress} className="h-3" />
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(budgetUsed)} spent · {formatCurrency(budgetRemaining)} remaining
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Cleared for Release</CardTitle>
              <CardDescription>Release readiness status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {project.cleared_for_release ? 'CLEARED' : 'NOT CLEARED'}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {project.cleared_for_release
                    ? 'All requirements met'
                    : 'Complete all blocking milestones'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones Table */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>
              Track your release timeline and content requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Blocks Release</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((milestone: Milestone) => (
                  <TableRow key={milestone.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{milestone.name}</div>
                        {milestone.description && (
                          <div className="text-sm text-muted-foreground">{milestone.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(milestone.due_date)}</TableCell>
                    <TableCell>{getMilestoneStatusBadge(milestone)}</TableCell>
                    <TableCell>
                      {milestone.blocks_release ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">
                          Required
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" disabled>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">
                {milestones.filter((m: Milestone) => m.blocks_release === 1 && m.status !== 'complete').length}
              </div>
              <div className="text-sm text-muted-foreground">Blocking milestones remaining</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-secondary">
                {milestones.filter((m: Milestone) => {
                  const dueDate = new Date(m.due_date);
                  const now = new Date();
                  return dueDate < now && m.status !== 'complete';
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">Overdue milestones</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {Math.ceil((new Date(project.release_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-sm text-muted-foreground">Days until release</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {Object.keys(budget_summary?.by_category || {}).length}
              </div>
              <div className="text-sm text-muted-foreground">Budget categories used</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
