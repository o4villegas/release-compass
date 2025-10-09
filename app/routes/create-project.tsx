import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateProjectRequest } from '@/types';

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    artist_name: '',
    release_title: '',
    release_date: '',
    release_type: 'single' as 'single' | 'EP' | 'album',
    total_budget: '',
  });

  // Get or create user UUID
  const getUserUuid = (): string => {
    let uuid = localStorage.getItem('userUuid');
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem('userUuid', uuid);
    }
    return uuid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.artist_name || !formData.release_title || !formData.release_date || !formData.total_budget) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      const budget = parseInt(formData.total_budget);
      if (isNaN(budget) || budget <= 0) {
        setError('Budget must be a positive number');
        setLoading(false);
        return;
      }

      // Check if release date is in the future
      const releaseDate = new Date(formData.release_date);
      const now = new Date();
      if (releaseDate <= now) {
        setError('Release date must be in the future');
        setLoading(false);
        return;
      }

      const payload: CreateProjectRequest = {
        artist_name: formData.artist_name,
        release_title: formData.release_title,
        release_date: formData.release_date,
        release_type: formData.release_type,
        total_budget: budget,
        user_uuid: getUserUuid(),
      };

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json() as { project: { id: string } };

      // Navigate to project dashboard
      navigate(`/project/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Release Compass
          </h1>
          <p className="text-muted-foreground">
            Create a new music release project
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>New Release Project</CardTitle>
            <CardDescription>
              Enter your release details. Milestones and timelines will be automatically generated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="artist_name">Artist Name</Label>
                <Input
                  id="artist_name"
                  placeholder="Enter artist name"
                  value={formData.artist_name}
                  onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_title">Release Title</Label>
                <Input
                  id="release_title"
                  placeholder="Enter release title"
                  value={formData.release_title}
                  onChange={(e) => setFormData({ ...formData, release_title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_date">Release Date</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Must be a future date
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_type">Release Type</Label>
                <Select
                  value={formData.release_type}
                  onValueChange={(value: 'single' | 'EP' | 'album') =>
                    setFormData({ ...formData, release_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="EP">EP</SelectItem>
                    <SelectItem value="album">Album</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_budget">Total Budget ($)</Label>
                <Input
                  id="total_budget"
                  type="number"
                  placeholder="50000"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  required
                  min="1"
                />
                <p className="text-sm text-muted-foreground">
                  Enter your total project budget in USD
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 btn-primary"
                >
                  {loading ? 'Creating Project...' : 'Create Project'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
