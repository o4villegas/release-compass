import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Rocket, AlertTriangle } from 'lucide-react';
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

  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [artworkDimensions, setArtworkDimensions] = useState<{ width: number; height: number } | null>(null);

  // Get or create user UUID
  const getUserUuid = (): string => {
    let uuid = localStorage.getItem('userUuid');
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem('userUuid', uuid);
    }
    return uuid;
  };

  // Handle artwork file selection with validation
  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setArtworkFile(null);
      setArtworkPreview(null);
      setArtworkDimensions(null);
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Artwork must be under 10MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Artwork must be JPG or PNG');
      return;
    }

    // Validate dimensions (client-side)
    const img = new Image();
    img.onload = () => {
      // Check minimum dimensions (3000x3000 for high-quality distribution)
      if (img.width < 3000 || img.height < 3000) {
        setError('Artwork must be at least 3000x3000 pixels for distribution quality');
        setArtworkFile(null);
        setArtworkPreview(null);
        setArtworkDimensions(null);
        return;
      }

      // Check aspect ratio (must be square)
      const aspectRatio = img.width / img.height;
      if (Math.abs(aspectRatio - 1) > 0.01) {
        setError('Artwork must be square (1:1 aspect ratio)');
        setArtworkFile(null);
        setArtworkPreview(null);
        setArtworkDimensions(null);
        return;
      }

      // All validations passed
      setError(null);
      setArtworkFile(file);
      setArtworkPreview(img.src);
      setArtworkDimensions({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      setError('Failed to load image. Please try another file.');
      setArtworkFile(null);
      setArtworkPreview(null);
      setArtworkDimensions(null);
    };

    img.src = URL.createObjectURL(file);
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

      // Use FormData to support artwork file upload
      const formDataPayload = new FormData();
      formDataPayload.append('artist_name', formData.artist_name);
      formDataPayload.append('release_title', formData.release_title);
      formDataPayload.append('release_date', formData.release_date);
      formDataPayload.append('release_type', formData.release_type);
      formDataPayload.append('total_budget', budget.toString());
      formDataPayload.append('user_uuid', getUserUuid());

      // Add artwork if provided
      if (artworkFile && artworkDimensions) {
        formDataPayload.append('artwork', artworkFile);
        formDataPayload.append('artwork_width', artworkDimensions.width.toString());
        formDataPayload.append('artwork_height', artworkDimensions.height.toString());
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formDataPayload, // No Content-Type header - browser sets it with boundary
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
      <div className="max-w-4xl mx-auto animate-scale-in">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 glow-sm">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-primary">
              Release Compass
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create a new music release project
          </p>
        </div>

        <Card elevation="floating" glow="primary" className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">New Release Project</CardTitle>
            <CardDescription>
              Enter your release details. Milestones and timelines will be automatically generated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6 stagger-children">
              {error && (
                <div
                  role="alert"
                  className="bg-destructive/20 border-2 border-destructive text-destructive-foreground px-4 py-3 rounded-md flex items-center gap-3"
                >
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Row 1: Artist Name + Release Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="artist_name">Artist Name</Label>
                  <Input
                    id="artist_name"
                    placeholder="Enter artist name"
                    value={formData.artist_name}
                    onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
                    className="focus-glow"
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
                    className="focus-glow"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Release Date + Release Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="release_date">Release Date</Label>
                  <Input
                    id="release_date"
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="focus-glow"
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
                    <SelectTrigger className="focus-glow">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="EP">EP</SelectItem>
                      <SelectItem value="album">Album</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Total Budget (full width) */}
              <div className="space-y-2">
                <Label htmlFor="total_budget">Total Budget ($)</Label>
                <Input
                  id="total_budget"
                  type="number"
                  placeholder="50000"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  className="focus-glow"
                  required
                  min="1"
                />
                <p className="text-sm text-muted-foreground">
                  Enter your total project budget in USD
                </p>
              </div>

              {/* Row 4: Album Artwork (optional) */}
              <div className="space-y-2">
                <Label htmlFor="artwork">Album Artwork (Optional)</Label>
                <Input
                  id="artwork"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleArtworkChange}
                  className="focus-glow"
                />
                <p className="text-sm text-muted-foreground">
                  JPG or PNG, minimum 3000x3000px, square (1:1), max 10MB
                </p>
                {artworkPreview && artworkDimensions && (
                  <div className="mt-3 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start gap-4">
                      <img
                        src={artworkPreview}
                        alt="Artwork preview"
                        className="w-32 h-32 rounded-lg object-cover border-2 border-primary/20"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">Preview</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {artworkDimensions.width} × {artworkDimensions.height}px
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Artwork meets distribution requirements
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="glow-hover-md"
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
