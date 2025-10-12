import type { Route } from "./+types/projects";
import { useLoaderData, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { EmptyState } from '~/components/ui/empty-state';
import { Music, CheckCircle } from 'lucide-react';
import type { ProjectSummary } from '~/types';

export async function loader({ request }: Route.LoaderArgs) {
  // Get user UUID from localStorage (client-side only)
  if (typeof window === 'undefined') {
    // SSR: return empty state, will be populated on client
    return { projects: [] };
  }

  const userUuid = localStorage.getItem('user_uuid') || crypto.randomUUID();
  localStorage.setItem('user_uuid', userUuid);

  // Fetch projects for this user
  const response = await fetch(`/api/projects?user_uuid=${encodeURIComponent(userUuid)}`);

  if (!response.ok) {
    throw new Response('Failed to load projects', { status: response.status });
  }

  const projects = await response.json() as ProjectSummary[];

  return { projects };
}

export default function Projects() {
  const { projects } = useLoaderData<typeof loader>();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntilRelease = (releaseDate: string) => {
    const days = Math.ceil(
      (new Date(releaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  if (projects.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">My Projects</h1>
        <EmptyState
          icon={<Music className="h-16 w-16 text-muted-foreground" />}
          title="No Projects Yet"
          description="Create your first music release project to get started with structured release management, content quota enforcement, and budget tracking."
          action={{
            label: "Create New Project",
            to: "/create-project"
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">My Projects</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Button asChild>
          <Link to="/create-project">Create New Project</Link>
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const daysUntilRelease = getDaysUntilRelease(project.release_date);
          const isOverdue = daysUntilRelease < 0;
          const budgetPercentage = (project.budget_spent / project.total_budget) * 100;
          const milestoneProgress = project.milestones_total > 0
            ? (project.milestones_complete / project.milestones_total) * 100
            : 0;

          return (
            <Card key={project.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl truncate">
                      {project.release_title}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {project.artist_name}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    <Badge variant="outline" className="capitalize">
                      {project.release_type}
                    </Badge>
                    {project.cleared_for_release === 1 && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Cleared
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Release Date */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Release Date</span>
                    <span className={isOverdue ? 'text-destructive font-semibold' : 'font-semibold'}>
                      {isOverdue ? `${Math.abs(daysUntilRelease)}d overdue` : `${daysUntilRelease}d away`}
                    </span>
                  </div>
                  <p className="text-sm">{formatDate(project.release_date)}</p>
                </div>

                {/* Milestones Progress */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">
                      {project.milestones_complete} / {project.milestones_total} milestones
                    </span>
                  </div>
                  <Progress value={milestoneProgress} />
                </div>

                {/* View Button */}
                <Button asChild className="w-full" variant="outline">
                  <Link to={`/project/${project.id}`}>
                    View Project
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
