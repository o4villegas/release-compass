import type { Route } from "./+types/project.$id.teasers";
import { useLoaderData, Link, useRevalidator } from 'react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { Checkbox } from '~/components/ui/checkbox';
import { AlertCircle, CheckCircle, ArrowLeft, Calendar, ExternalLink } from 'lucide-react';

type Platform = 'TikTok' | 'Instagram' | 'YouTube' | 'Twitter' | 'Facebook';

interface TeaserPost {
  id: string;
  platform: Platform;
  post_url: string;
  snippet_duration: number;
  song_section: string;
  posted_at: string;
  presave_link_included: number;
  engagement_metrics?: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    last_updated: string;
  };
}

interface TeaserRequirement {
  required: number;
  actual: number;
  met: boolean;
}

const PLATFORMS: Platform[] = ['TikTok', 'Instagram', 'YouTube', 'Twitter', 'Facebook'];
const SONG_SECTIONS = ['intro', 'verse', 'chorus', 'bridge', 'outro'];

const PLATFORM_COLORS: Record<Platform, string> = {
  TikTok: 'bg-black text-white',
  Instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  YouTube: 'bg-red-600 text-white',
  Twitter: 'bg-blue-400 text-white',
  Facebook: 'bg-blue-600 text-white',
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const { id } = params;
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api`;

  // Fetch project details
  const projectRes = await fetch(`${apiUrl}/projects/${id}`);
  if (!projectRes.ok) throw new Error('Failed to fetch project');
  const projectData = await projectRes.json();

  // Fetch teasers for this project
  const teasersRes = await fetch(`${apiUrl}/projects/${id}/teasers`);
  if (!teasersRes.ok) throw new Error('Failed to fetch teasers');
  const teasersData = await teasersRes.json();

  return {
    project: projectData.project,
    teasers: teasersData.teasers as TeaserPost[],
    requirement: teasersData.requirement as TeaserRequirement,
    optimalWindow: teasersData.optimal_posting_window as { start: string; end: string } | null,
  };
}

export default function ProjectTeasers() {
  const { project, teasers, requirement, optimalWindow } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  const [platform, setPlatform] = useState<Platform>('TikTok');
  const [postUrl, setPostUrl] = useState('');
  const [snippetDuration, setSnippetDuration] = useState('15');
  const [songSection, setSongSection] = useState('chorus');
  const [presaveLinkIncluded, setPresaveLinkIncluded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Engagement tracking state
  const [selectedTeaser, setSelectedTeaser] = useState<string | null>(null);
  const [views, setViews] = useState('');
  const [likes, setLikes] = useState('');
  const [shares, setShares] = useState('');
  const [comments, setComments] = useState('');
  const [updatingEngagement, setUpdatingEngagement] = useState(false);

  const userUuid = typeof window !== 'undefined' ? localStorage.getItem('user_uuid') || crypto.randomUUID() : '';
  if (typeof window !== 'undefined' && !localStorage.getItem('user_uuid')) {
    localStorage.setItem('user_uuid', userUuid);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!postUrl.trim()) {
      setError('Please provide a post URL');
      return;
    }

    const duration = parseInt(snippetDuration);
    if (isNaN(duration) || duration < 5 || duration > 60) {
      setError('Snippet duration must be between 5 and 60 seconds');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/teasers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          platform,
          post_url: postUrl.trim(),
          snippet_duration: duration,
          song_section: songSection,
          presave_link_included: presaveLinkIncluded,
          user_uuid: userUuid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create teaser post');
      }

      setSuccess('Teaser post added successfully');
      if (data.posting_window_warning) {
        setSuccess(`Teaser post added. Note: ${data.posting_window_warning}`);
      }

      // Reset form
      setPostUrl('');
      setSnippetDuration('15');
      setSongSection('chorus');
      setPresaveLinkIncluded(false);

      // Revalidate to refresh teaser data
      revalidator.revalidate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEngagement = async (teaserId: string) => {
    setError('');
    setUpdatingEngagement(true);

    try {
      const response = await fetch(`/api/teasers/${teaserId}/engagement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          views: parseInt(views) || 0,
          likes: parseInt(likes) || 0,
          shares: parseInt(shares) || 0,
          comments: parseInt(comments) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update engagement');
      }

      setSuccess('Engagement metrics updated');
      setSelectedTeaser(null);
      setViews('');
      setLikes('');
      setShares('');
      setComments('');

      // Revalidate to refresh data
      revalidator.revalidate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingEngagement(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isInOptimalWindow = () => {
    if (!optimalWindow) return null;
    const now = new Date();
    const start = new Date(optimalWindow.start);
    const end = new Date(optimalWindow.end);
    return now >= start && now <= end;
  };

  const platformsUsed = new Set(teasers.map((t) => t.platform));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/project/${project.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{project.release_title}</h1>
        <p className="text-muted-foreground">Teaser Content Tracker</p>
      </div>

      {/* Teaser Requirements Overview */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Teaser Requirement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requirement.actual} / {requirement.required}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {requirement.met ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Requirement met
                </span>
              ) : (
                <span className="text-yellow-600">
                  {requirement.required - requirement.actual} more needed
                </span>
              )}
            </p>
            <Progress
              value={(requirement.actual / requirement.required) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Optimal Posting Window</CardTitle>
          </CardHeader>
          <CardContent>
            {optimalWindow ? (
              <>
                <div className="text-sm font-medium">
                  {formatDate(optimalWindow.start)} - {formatDate(optimalWindow.end)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  21-28 days before release
                </p>
                {isInOptimalWindow() === true && (
                  <Badge className="mt-2 bg-green-500">In optimal window</Badge>
                )}
                {isInOptimalWindow() === false && (
                  <Badge className="mt-2 bg-gray-400">Outside optimal window</Badge>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Platforms Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {PLATFORMS.map((p) => (
                <Badge
                  key={p}
                  variant={platformsUsed.has(p) ? 'default' : 'outline'}
                  className={platformsUsed.has(p) ? PLATFORM_COLORS[p] : ''}
                >
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add Teaser Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Teaser Post</CardTitle>
            <CardDescription>
              Record a new teaser post across social platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="postUrl">Post URL</Label>
                <Input
                  id="postUrl"
                  type="url"
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Snippet Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="60"
                    value={snippetDuration}
                    onChange={(e) => setSnippetDuration(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">5-60 seconds</p>
                </div>

                <div>
                  <Label htmlFor="section">Song Section</Label>
                  <Select value={songSection} onValueChange={setSongSection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SONG_SECTIONS.map((section) => (
                        <SelectItem key={section} value={section}>
                          {section.charAt(0).toUpperCase() + section.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="presave"
                  checked={presaveLinkIncluded}
                  onCheckedChange={(checked) => setPresaveLinkIncluded(checked === true)}
                />
                <Label htmlFor="presave" className="text-sm font-normal cursor-pointer">
                  Pre-save link included in post
                </Label>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-500">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Teaser Post'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Teaser Posts List */}
        <Card>
          <CardHeader>
            <CardTitle>Posted Teasers</CardTitle>
            <CardDescription>
              {teasers.length} teaser{teasers.length !== 1 ? 's' : ''} posted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teasers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No teasers posted yet. Add your first teaser to get started.
                </p>
              ) : (
                teasers.map((teaser) => (
                  <div
                    key={teaser.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={PLATFORM_COLORS[teaser.platform]}>
                            {teaser.platform}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(teaser.posted_at)}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {teaser.snippet_duration}s {teaser.song_section}
                            </span>
                            {teaser.presave_link_included === 1 && (
                              <Badge variant="outline" className="text-xs">
                                Pre-save link
                              </Badge>
                            )}
                          </div>
                          <a
                            href={teaser.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                          >
                            View post <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Engagement Metrics */}
                    {teaser.engagement_metrics ? (
                      <div className="pt-2 border-t">
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground">Views</div>
                            <div className="font-semibold">
                              {formatNumber(teaser.engagement_metrics.views)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Likes</div>
                            <div className="font-semibold">
                              {formatNumber(teaser.engagement_metrics.likes)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Shares</div>
                            <div className="font-semibold">
                              {formatNumber(teaser.engagement_metrics.shares)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Comments</div>
                            <div className="font-semibold">
                              {formatNumber(teaser.engagement_metrics.comments)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedTeaser(teaser.id)}
                      >
                        Add Engagement Metrics
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Update Modal (Simple inline form) */}
      {selectedTeaser && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Update Engagement Metrics</CardTitle>
            <CardDescription>
              Add performance data for this teaser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="views">Views</Label>
                <Input
                  id="views"
                  type="number"
                  min="0"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="likes">Likes</Label>
                <Input
                  id="likes"
                  type="number"
                  min="0"
                  value={likes}
                  onChange={(e) => setLikes(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  min="0"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="comments">Comments</Label>
                <Input
                  id="comments"
                  type="number"
                  min="0"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleUpdateEngagement(selectedTeaser)}
                disabled={updatingEngagement}
              >
                {updatingEngagement ? 'Updating...' : 'Update Metrics'}
              </Button>
              <Button variant="outline" onClick={() => setSelectedTeaser(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
