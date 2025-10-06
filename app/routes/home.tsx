import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Release Compass - Music Release Management" },
    { name: "description", content: "Manage your music release projects with structured workflows" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-primary mb-4">
            Release Compass
          </h1>
          <p className="text-xl text-muted-foreground">
            Music release management built for label-funded artists
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-border bg-card hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="text-2xl">Create New Project</CardTitle>
              <CardDescription>
                Start a new music release with automated milestone generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/create-project">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 btn-primary">
                  New Release Project
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-2xl">Features</CardTitle>
              <CardDescription>
                What makes Release Compass different
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="text-primary">✓</div>
                <div>Content quota enforcement - can't complete milestones without capturing marketing content</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-primary">✓</div>
                <div>Automated timeline generation based on release date</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-primary">✓</div>
                <div>Budget tracking with category allocations</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-primary">✓</div>
                <div>Cleared-for-release status with 9-point checklist</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Built for artists, managers, and labels</p>
        </div>
      </div>
    </div>
  );
}
