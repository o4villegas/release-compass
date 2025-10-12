import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

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
          <div className="flex justify-center mb-6">
            <img
              src="/releasecompass-logo.png"
              alt="Release Compass"
              className="h-32 w-auto object-contain"
            />
          </div>
          <p className="text-xl text-muted-foreground">
            Music release management built for label-funded artists
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border bg-card hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="text-2xl">View Projects</CardTitle>
              <CardDescription>
                View and manage all your music release projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/projects">
                <Button className="w-full" variant="outline">
                  All Projects
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="text-2xl">Create New Project</CardTitle>
              <CardDescription>
                Start a new music release with automated milestone generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/create-project">
                <Button size="lg" className="w-full">
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
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>Enforces content capture before milestone completion</div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>Auto-generates timeline from release date</div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>Tracks budget with category allocations</div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>Validates release readiness with checklist</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Card className="border-border bg-card/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-3">Demo Project</p>
              {/* Official demo project ID: b434c7af-5501-4ef7-a640-9cb19b2fe28d */}
              {/* This project is seeded by scripts/enhance-demo-project.sql */}
              <Link to="/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d">
                <Button variant="outline" size="sm" className="w-full">
                  View Demo Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Built for artists, managers, and labels</p>
        </div>
      </div>
    </div>
  );
}
