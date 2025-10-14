# Content Lineage & Repurposing System
**Source Tracking from Capture → Post → Repurpose**

**Date:** October 9, 2025
**Context:** Track content lifecycle from original capture through multiple posts/repurposing

---

## 🎯 Business Problem

### The Content Lifecycle Challenge

**Real-World Scenario:**
```
Day 1 (Recording Session):
→ Artist captures "Studio Vocal Booth - Short Video" (30 seconds)
→ Uploaded to Release Compass
→ Content ID: content-001

Day 15 (Marketing Campaign Launch):
→ Content manager uses content-001 for Instagram Reel
→ Posts to Instagram with caption/hashtags
→ Post URL: instagram.com/p/abc123

Day 20 (Cross-Platform Strategy):
→ Same content-001 repurposed for TikTok
→ Different caption, trending sound added
→ Post URL: tiktok.com/@artist/video/xyz789

Day 25 (YouTube Shorts):
→ Same content-001 repurposed again for YouTube Shorts
→ Post URL: youtube.com/shorts/def456
```

**Current System Gaps:**
1. ❌ **No source tracking** - Can't trace which original content was used for each post
2. ❌ **No repurpose tracking** - Can't see that content-001 was used 3 times across platforms
3. ❌ **No chronological lineage** - Can't see posting timeline for a single piece of content
4. ❌ **No ROI calculation** - Can't measure "this 30-second video generated 3 posts"
5. ❌ **Duplicate prevention missing** - Team might re-capture same type of content unnecessarily

---

## ✅ Existing Schema Analysis

### What Already Exists

**Teaser Posts Table** (lines 136-151):
```sql
CREATE TABLE teaser_posts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  post_url TEXT NOT NULL,
  snippet_duration INTEGER NOT NULL,
  song_section TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  presave_link_included INTEGER DEFAULT 0,
  engagement_metrics TEXT,
  source_content_id TEXT,  ✅ ALREADY EXISTS!
  created_by TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (source_content_id) REFERENCES content_items(id)  ✅ LINKS TO CONTENT!
);
```

**Key Insight:**
- `teaser_posts` table **already has source tracking** via `source_content_id`
- This pattern proves the concept was considered
- But it's only implemented for teasers (audio snippets), not general content

**Gap:**
- General content posts (Instagram photos, TikTok videos, etc.) have no equivalent tracking
- `content_items` table has posting fields but no source lineage for repurposing

---

## 🏗️ Proposed Solution: Content Posts Table

### New Table: `content_posts`

**Purpose:** Track each individual post made from source content, enabling:
- Multiple posts from same source content (repurposing)
- Full lineage tracking (capture → post history)
- Platform-specific variants (same video, different captions)
- Engagement metrics per post
- ROI analysis (content efficiency)

### Schema Design

**File:** `migrations/004_content_posts_table.sql` (NEW)

```sql
-- Content posts table - tracks individual posts from source content
CREATE TABLE content_posts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_content_id TEXT NOT NULL,  -- Links to original content_items

  -- Posting details
  platform TEXT NOT NULL,            -- Instagram, TikTok, YouTube, etc.
  post_url TEXT NOT NULL,            -- Link to actual post
  posted_at TEXT NOT NULL,           -- When physically posted
  posted_confirmed_by TEXT NOT NULL, -- Who confirmed (initials)
  posted_confirmed_at TEXT NOT NULL, -- When confirmed in app

  -- Content variations
  caption_used TEXT,                 -- Actual caption used (may differ from original)
  hashtags_used TEXT,                -- Platform-specific hashtags
  thumbnail_timestamp INTEGER,       -- For videos: which frame used as thumbnail
  crop_settings TEXT,                -- JSON: platform-specific cropping (16:9, 9:16, 1:1)
  filters_applied TEXT,              -- Platform filters/effects added

  -- Engagement tracking
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0.0,  -- Calculated: (likes + comments + shares) / views
  engagement_notes TEXT,             -- Qualitative notes

  -- Metadata
  is_paid_promotion INTEGER DEFAULT 0,
  promotion_budget INTEGER,
  created_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (source_content_id) REFERENCES content_items(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_content_posts_source ON content_posts(source_content_id);
CREATE INDEX idx_content_posts_platform ON content_posts(platform);
CREATE INDEX idx_content_posts_project ON content_posts(project_id);
CREATE INDEX idx_content_posts_posted_at ON content_posts(posted_at);
```

**Design Rationale:**

1. **One source, many posts** - `source_content_id` links back to original content_items
2. **Platform-specific metadata** - Each post can have different caption, crop, hashtags
3. **Engagement tracking** - Measure performance per post
4. **Audit trail** - `posted_confirmed_by` + timestamp for accountability
5. **Cascade delete** - If source content deleted, all posts are also deleted

---

## 🔄 Content Lifecycle Workflow

### Phase 1: Capture (Existing)

**Action:** Upload content during recording session

**Database State:**
```sql
-- content_items table
INSERT INTO content_items (
  id: 'content-001',
  content_type: 'short_video',
  capture_context: 'recording_session',
  storage_key: 's3://bucket/studio-vocals-001.mp4',
  caption_draft: 'Behind the scenes in the studio 🎤',
  intended_platforms: 'Instagram, TikTok, YouTube',
  posting_status: 'not_posted',  -- Original content not yet posted
  milestone_id: 'milestone-recording'
)
```

---

### Phase 2: Schedule (Planned in Phase 4)

**Action:** Schedule content for posting on specific date

**Database Update:**
```sql
UPDATE content_items
SET scheduled_date = '2025-10-15',
    posting_status = 'scheduled'
WHERE id = 'content-001';
```

**UI State:**
- Content appears on calendar for Oct 15
- Badge shows: 📅 Scheduled

---

### Phase 3: First Post (NEW - Enhanced Confirmation)

**Action:** Content manager posts to Instagram, then confirms in app

**New Modal Flow:**
```typescript
ConfirmPostingModal opens with new options:
- Post URL: https://instagram.com/p/abc123
- Your Initials: JD
- Platform: ☑ Instagram
- Caption Used: "Studio vibes 🎤 New music coming soon 🔥 #newmusic #studio"
- Hashtags: "#newmusic #studio #artist #recording #vocals"
- Engagement Notes: "Strong early engagement, 200+ likes in 2 hours"
```

**Database Writes:**

```sql
-- 1. Update source content_items
UPDATE content_items
SET posting_status = 'posted',  -- Mark as posted at least once
    posted_at = '2025-10-15T14:00:00Z'  -- First post time
WHERE id = 'content-001';

-- 2. Create content_posts record (NEW TABLE)
INSERT INTO content_posts (
  id: 'post-001',
  project_id: 'project-123',
  source_content_id: 'content-001',  ✅ LINKS TO SOURCE

  platform: 'Instagram',
  post_url: 'https://instagram.com/p/abc123',
  posted_at: '2025-10-15T14:00:00Z',
  posted_confirmed_by: 'JD',
  posted_confirmed_at: '2025-10-15T14:05:00Z',

  caption_used: 'Studio vibes 🎤 New music coming soon 🔥 #newmusic #studio',
  hashtags_used: '#newmusic #studio #artist #recording #vocals',

  likes_count: 200,
  views_count: 1500,
  engagement_rate: 0.133,  -- 200/1500
  engagement_notes: 'Strong early engagement',

  created_at: '2025-10-15T14:05:00Z'
);
```

**UI State:**
- Source content (content-001) badge changes: ✅ Posted (JD) - 1 post
- Post history panel shows: "Posted to Instagram on Oct 15"
- Milestone posting quota updates: +1 posted

---

### Phase 4: Repurpose for TikTok (NEW - Multi-Post)

**Action:** 5 days later, use same content for TikTok with trending sound

**New Modal Flow:**
```typescript
"Repost Content" modal (triggered from content library):
- Source Content: content-001 (Studio Vocal Booth video)
- Platform: ☑ TikTok
- Post URL: https://tiktok.com/@artist/video/xyz789
- Caption Used: "POV: Recording vocals for new single 🎶 #fyp #newmusic"
- Hashtags: "#fyp #newmusic #recording #vocals #artist #studio"
- Modifications: "Added trending sound 'Studio Sessions'"
- Initials: SM (Social Media Manager)
```

**Database Write:**

```sql
-- Source content_items already has posting_status = 'posted', no update needed
-- Just create NEW content_posts record

INSERT INTO content_posts (
  id: 'post-002',
  project_id: 'project-123',
  source_content_id: 'content-001',  ✅ SAME SOURCE AS post-001

  platform: 'TikTok',
  post_url: 'https://tiktok.com/@artist/video/xyz789',
  posted_at: '2025-10-20T16:30:00Z',
  posted_confirmed_by: 'SM',
  posted_confirmed_at: '2025-10-20T16:35:00Z',

  caption_used: 'POV: Recording vocals for new single 🎶 #fyp #newmusic',
  hashtags_used: '#fyp #newmusic #recording #vocals #artist #studio',
  filters_applied: 'Added trending sound: Studio Sessions',

  likes_count: 850,
  views_count: 12000,
  engagement_rate: 0.071,  -- 850/12000

  created_at: '2025-10-20T16:35:00Z'
);
```

**UI State:**
- Source content (content-001) badge updates: ✅ Posted (JD, SM) - 2 posts
- Post history panel shows:
  ```
  Posted to 2 platforms:
  • Instagram - Oct 15 (JD) - 200 likes
  • TikTok - Oct 20 (SM) - 850 likes
  ```

---

### Phase 5: Third Repurpose for YouTube Shorts (Multi-Post Continued)

**Action:** Same content posted to YouTube Shorts

**Database Write:**

```sql
INSERT INTO content_posts (
  id: 'post-003',
  project_id: 'project-123',
  source_content_id: 'content-001',  ✅ SAME SOURCE

  platform: 'YouTube Shorts',
  post_url: 'https://youtube.com/shorts/def456',
  posted_at: '2025-10-25T10:00:00Z',
  posted_confirmed_by: 'JD',
  posted_confirmed_at: '2025-10-25T10:05:00Z',

  caption_used: 'Studio session vibes 🎤 New music dropping soon!',

  views_count: 3200,
  likes_count: 180,
  engagement_rate: 0.056,

  created_at: '2025-10-25T10:05:00Z'
);
```

**Final UI State:**
- Source content badge: ✅ Posted (JD, SM, JD) - 3 posts
- Post history timeline:
  ```
  Oct 15: Instagram (JD) - 200 likes, 1.5K views
  Oct 20: TikTok (SM) - 850 likes, 12K views
  Oct 25: YouTube Shorts (JD) - 180 likes, 3.2K views

  Total Reach: 16.7K views from 1 piece of content
  Total Engagement: 1,230 likes
  ROI: 3 posts from 1 capture (3x efficiency)
  ```

---

## 🎨 Frontend Components

### Component 1: ContentPostHistoryPanel

**File:** `app/components/ContentPostHistoryPanel.tsx` (NEW)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';

interface ContentPost {
  id: string;
  platform: string;
  post_url: string;
  posted_at: string;
  posted_confirmed_by: string;
  caption_used: string;
  likes_count: number;
  views_count: number;
  engagement_rate: number;
}

interface ContentPostHistoryPanelProps {
  sourceContentId: string;
  posts: ContentPost[];
}

export function ContentPostHistoryPanel({
  sourceContentId,
  posts
}: ContentPostHistoryPanelProps) {
  if (posts.length === 0) {
    return (
      <Card className="border-blue-500/50 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-center text-blue-700">
            <p className="font-semibold mb-2">📱 Not Posted Yet</p>
            <p className="text-sm">This content hasn't been posted to any platform.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalViews = posts.reduce((sum, p) => sum + p.views_count, 0);
  const totalLikes = posts.reduce((sum, p) => sum + p.likes_count, 0);
  const avgEngagement = posts.reduce((sum, p) => sum + p.engagement_rate, 0) / posts.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Post History</CardTitle>
          <Badge variant="default">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {totalViews.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {totalLikes.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Likes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {(avgEngagement * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Engagement</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Timeline:</p>
          {posts
            .sort((a, b) => new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime())
            .map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-3 p-3 border border-border rounded-lg hover:border-primary transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{post.platform}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.posted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      by {post.posted_confirmed_by}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.caption_used}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span>👁️ {post.views_count.toLocaleString()} views</span>
                    <span>❤️ {post.likes_count.toLocaleString()} likes</span>
                    <span>📊 {(post.engagement_rate * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                    🔗 View
                  </a>
                </Button>
              </div>
            ))}
        </div>

        {/* ROI Insight */}
        {posts.length > 1 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-green-800">
              🎯 Content ROI: {posts.length}x efficiency
            </p>
            <p className="text-xs text-green-700 mt-1">
              This single piece of content generated {posts.length} posts across {new Set(posts.map(p => p.platform)).size} platforms,
              reaching {totalViews.toLocaleString()} total viewers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Timeline:** 1 day
**Testing:** E2E test (verify post history displays, stats calculate correctly)

---

### Component 2: RepostContentModal

**File:** `app/components/RepostContentModal.tsx` (NEW)

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';

interface ContentItem {
  id: string;
  content_type: string;
  caption_draft: string | null;
}

interface RepostContentModalProps {
  sourceContent: ContentItem;
  existingPosts: Array<{ platform: string }>;  // To show which platforms already used
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RepostData) => void;
}

interface RepostData {
  post_url: string;
  platform: string;
  confirmed_by_initials: string;
  caption_used: string;
  hashtags_used: string;
  modifications?: string;
  views_count?: number;
  likes_count?: number;
}

const PLATFORM_OPTIONS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'YouTube Shorts',
  'Twitter/X',
  'Facebook',
  'Threads',
  'LinkedIn'
];

export function RepostContentModal({
  sourceContent,
  existingPosts,
  open,
  onClose,
  onSubmit
}: RepostContentModalProps) {
  const [postUrl, setPostUrl] = useState('');
  const [platform, setPlatform] = useState('');
  const [initials, setInitials] = useState('');
  const [captionUsed, setCaptionUsed] = useState(sourceContent.caption_draft || '');
  const [hashtagsUsed, setHashtagsUsed] = useState('');
  const [modifications, setModifications] = useState('');
  const [viewsCount, setViewsCount] = useState('');
  const [likesCount, setLikesCount] = useState('');
  const [error, setError] = useState('');

  const usedPlatforms = new Set(existingPosts.map(p => p.platform));

  const handleSubmit = () => {
    setError('');

    if (!postUrl || !platform || !initials || !captionUsed) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      new URL(postUrl);
    } catch {
      setError('Please enter a valid post URL');
      return;
    }

    onSubmit({
      post_url: postUrl,
      platform,
      confirmed_by_initials: initials.toUpperCase(),
      caption_used: captionUsed,
      hashtags_used: hashtagsUsed,
      modifications: modifications || undefined,
      views_count: viewsCount ? parseInt(viewsCount) : undefined,
      likes_count: likesCount ? parseInt(likesCount) : undefined
    });

    // Reset form
    setPostUrl('');
    setPlatform('');
    setInitials('');
    setCaptionUsed(sourceContent.caption_draft || '');
    setHashtagsUsed('');
    setModifications('');
    setViewsCount('');
    setLikesCount('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Repost Content to New Platform</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Content Info */}
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{sourceContent.content_type.replace('_', ' ')}</Badge>
              {existingPosts.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Already posted to: {existingPosts.map(p => p.platform).join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Post URL */}
          <div className="space-y-2">
            <Label htmlFor="repost-url">
              Post URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="repost-url"
              placeholder="https://instagram.com/p/abc123"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
            />
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <Label htmlFor="repost-platform">
              Platform <span className="text-destructive">*</span>
            </Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="repost-platform">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map(plat => (
                  <SelectItem key={plat} value={plat}>
                    {plat}
                    {usedPlatforms.has(plat) && ' (already posted)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Your Initials */}
          <div className="space-y-2">
            <Label htmlFor="repost-initials">
              Your Initials <span className="text-destructive">*</span>
            </Label>
            <Input
              id="repost-initials"
              placeholder="e.g., SM"
              value={initials}
              onChange={(e) => setInitials(e.target.value)}
              maxLength={10}
            />
          </div>

          {/* Caption Used */}
          <div className="space-y-2">
            <Label htmlFor="repost-caption">
              Caption Used <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="repost-caption"
              placeholder="Actual caption used for this post..."
              value={captionUsed}
              onChange={(e) => setCaptionUsed(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Pre-filled with original caption draft. Update if you changed it.
            </p>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label htmlFor="repost-hashtags">Hashtags Used</Label>
            <Input
              id="repost-hashtags"
              placeholder="#newmusic #artist #studio"
              value={hashtagsUsed}
              onChange={(e) => setHashtagsUsed(e.target.value)}
            />
          </div>

          {/* Modifications */}
          <div className="space-y-2">
            <Label htmlFor="repost-mods">
              Modifications <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="repost-mods"
              placeholder="e.g., Cropped to 9:16, added trending sound, applied filter..."
              value={modifications}
              onChange={(e) => setModifications(e.target.value)}
              rows={2}
            />
          </div>

          {/* Engagement Metrics (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="repost-views">
                Views <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="repost-views"
                type="number"
                placeholder="e.g., 1500"
                value={viewsCount}
                onChange={(e) => setViewsCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repost-likes">
                Likes <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="repost-likes"
                type="number"
                placeholder="e.g., 200"
                value={likesCount}
                onChange={(e) => setLikesCount(e.target.value)}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            ✅ Confirm Repost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Timeline:** 1 day

---

### Component 3: Update ContentLightbox

**Update:** `app/components/ContentLightbox.tsx`

Add post history + repost action:

```typescript
import { ContentPostHistoryPanel } from '~/components/ContentPostHistoryPanel';
import { RepostContentModal } from '~/components/RepostContentModal';

// In component state:
const [posts, setPosts] = useState<ContentPost[]>([]);
const [repostModalOpen, setRepostModalOpen] = useState(false);

// Fetch posts when lightbox opens:
useEffect(() => {
  if (open && currentItem) {
    fetch(`/api/content/${currentItem.id}/posts`)
      .then(res => res.json())
      .then(data => setPosts(data.posts || []));
  }
}, [open, currentItem?.id]);

// In DialogContent, after media display:
<div className="mt-6">
  <ContentPostHistoryPanel
    sourceContentId={currentItem.id}
    posts={posts}
  />
</div>

// In DialogFooter, add repost button:
<Button onClick={() => setRepostModalOpen(true)}>
  🔄 Repost to Another Platform
</Button>

<RepostContentModal
  sourceContent={currentItem}
  existingPosts={posts}
  open={repostModalOpen}
  onClose={() => setRepostModalOpen(false)}
  onSubmit={handleRepost}
/>
```

**Timeline:** 2 hours

---

## 🔧 Backend Implementation

### API Endpoint: Get Content Posts

**File:** `workers/routes/content.ts` (UPDATE)

```typescript
// Get all posts for a source content item
app.get('/content/:contentId/posts', async (c) => {
  const { contentId } = c.req.param();

  const posts = await c.env.DB.prepare(`
    SELECT *
    FROM content_posts
    WHERE source_content_id = ?
    ORDER BY posted_at ASC
  `).bind(contentId).all();

  return c.json({ posts: posts.results });
});
```

**Timeline:** 30 minutes

---

### API Endpoint: Create Content Post (Repost)

**File:** `workers/routes/content.ts` (UPDATE)

```typescript
// Create new post from existing content (repurposing)
app.post('/content/:contentId/repost', async (c) => {
  const { contentId } = c.req.param();
  const {
    post_url,
    platform,
    confirmed_by_initials,
    caption_used,
    hashtags_used,
    modifications,
    views_count,
    likes_count
  } = await c.req.json();

  // Validation
  if (!post_url || !platform || !confirmed_by_initials || !caption_used) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  // Get source content project_id
  const sourceContent = await c.env.DB.prepare(`
    SELECT project_id FROM content_items WHERE id = ?
  `).bind(contentId).first();

  if (!sourceContent) {
    return c.json({ error: 'Source content not found' }, 404);
  }

  const now = new Date().toISOString();
  const postId = crypto.randomUUID();

  // Calculate engagement rate if metrics provided
  const engagementRate = (views_count && likes_count)
    ? likes_count / views_count
    : 0;

  // Create content_posts record
  await c.env.DB.prepare(`
    INSERT INTO content_posts (
      id, project_id, source_content_id,
      platform, post_url, posted_at, posted_confirmed_by, posted_confirmed_at,
      caption_used, hashtags_used, filters_applied,
      likes_count, views_count, engagement_rate,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    postId,
    sourceContent.project_id,
    contentId,
    platform,
    post_url,
    now,
    confirmed_by_initials,
    now,
    caption_used,
    hashtags_used || null,
    modifications || null,
    likes_count || 0,
    views_count || 0,
    engagementRate,
    now
  ).run();

  // Update source content_items if this is first post
  const existingPosts = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM content_posts WHERE source_content_id = ?
  `).bind(contentId).first();

  if (existingPosts && existingPosts.count === 1) {
    // First post - update source content status
    await c.env.DB.prepare(`
      UPDATE content_items
      SET posting_status = 'posted',
          posted_at = ?
      WHERE id = ?
    `).bind(now, contentId).run();
  }

  return c.json({
    success: true,
    post_id: postId,
    total_posts: (existingPosts?.count as number) || 1
  });
});
```

**Timeline:** 2 hours

---

### API Handler: Content ROI Analytics

**File:** `workers/api-handlers/content.ts` (NEW)

```typescript
export interface ContentROI {
  source_content_id: string;
  total_posts: number;
  platforms_used: string[];
  total_views: number;
  total_likes: number;
  total_shares: number;
  avg_engagement_rate: number;
  efficiency_score: number;  // posts per content item
}

export async function getContentROI(
  db: D1Database,
  projectId: string
): Promise<ContentROI[]> {
  const contentWithPosts = await db.prepare(`
    SELECT
      ci.id as source_content_id,
      ci.content_type,
      COUNT(cp.id) as total_posts,
      GROUP_CONCAT(DISTINCT cp.platform) as platforms,
      SUM(cp.views_count) as total_views,
      SUM(cp.likes_count) as total_likes,
      SUM(cp.shares_count) as total_shares,
      AVG(cp.engagement_rate) as avg_engagement_rate
    FROM content_items ci
    LEFT JOIN content_posts cp ON cp.source_content_id = ci.id
    WHERE ci.project_id = ?
    GROUP BY ci.id
    HAVING total_posts > 0
    ORDER BY total_posts DESC
  `).bind(projectId).all();

  return contentWithPosts.results.map(row => ({
    source_content_id: row.source_content_id as string,
    total_posts: row.total_posts as number,
    platforms_used: (row.platforms as string)?.split(',') || [],
    total_views: row.total_views as number || 0,
    total_likes: row.total_likes as number || 0,
    total_shares: row.total_shares as number || 0,
    avg_engagement_rate: row.avg_engagement_rate as number || 0,
    efficiency_score: row.total_posts as number
  }));
}
```

**Timeline:** 2 hours

---

## 📊 Dashboard & Reporting

### Widget: Content Efficiency Dashboard

**File:** `app/components/widgets/ContentEfficiencyWidget.tsx` (NEW)

```typescript
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';

interface ContentROI {
  source_content_id: string;
  total_posts: number;
  platforms_used: string[];
  total_views: number;
  efficiency_score: number;
}

export function ContentEfficiencyWidget({ roi }: { roi: ContentROI[] }) {
  const topPerformers = roi.slice(0, 3);
  const totalContent = roi.length;
  const totalPosts = roi.reduce((sum, r) => sum + r.total_posts, 0);
  const avgEfficiency = totalPosts / totalContent;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Efficiency</CardTitle>
        <CardDescription>
          {totalContent} pieces of content → {totalPosts} posts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Metric */}
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-3xl font-bold text-primary">
              {avgEfficiency.toFixed(1)}x
            </div>
            <div className="text-sm text-muted-foreground">
              Average posts per content item
            </div>
          </div>

          {/* Top Performers */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Top Repurposed Content:</p>
            {topPerformers.map(item => (
              <div
                key={item.source_content_id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.total_posts} posts</Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.platforms_used.join(', ')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.total_views.toLocaleString()} views
                  </div>
                </div>
                <div className="text-lg font-bold text-primary">
                  {item.efficiency_score}x
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Timeline:** 2 hours

---

## 🎯 Integration Summary

### Updated Confirmation Workflow

**ConfirmPostingModal** now creates TWO database records:

1. **Update `content_items`** (existing table):
   ```sql
   UPDATE content_items
   SET posting_status = 'posted',
       posted_at = NOW()
   WHERE id = source_content_id;
   ```

2. **Insert `content_posts`** (NEW table):
   ```sql
   INSERT INTO content_posts (
     source_content_id, platform, post_url, caption_used, ...
   ) VALUES (...);
   ```

**Result:** Full lineage tracking from source → posts

---

## 📅 Implementation Timeline

### Added to Phase 4 (Content Calendar + Posting)

| Task | Duration | Files |
|------|----------|-------|
| **Database** | | |
| Migration 004 (content_posts table) | 1 hour | `migrations/004_content_posts_table.sql` |
| **Components** | | |
| ContentPostHistoryPanel | 1 day | `app/components/ContentPostHistoryPanel.tsx` |
| RepostContentModal | 1 day | `app/components/RepostContentModal.tsx` |
| Update ContentLightbox (add history) | 2 hours | `app/components/ContentLightbox.tsx` |
| ContentEfficiencyWidget | 2 hours | `app/components/widgets/ContentEfficiencyWidget.tsx` |
| **Backend** | | |
| API: GET /content/:id/posts | 30 min | `workers/routes/content.ts` |
| API: POST /content/:id/repost | 2 hours | `workers/routes/content.ts` |
| Update ConfirmPostingModal (create post record) | 1 hour | Modified logic |
| Content ROI analytics handler | 2 hours | `workers/api-handlers/content.ts` |
| **Testing** | | |
| E2E tests (repurposing workflow) | 3 hours | `tests/e2e/content-repurposing.spec.ts` |
| **Total** | **4 days** | **8 files (5 new, 3 updates)** |

---

## ✅ Success Criteria

### Functional Requirements
- ✅ Track source content for every post (lineage)
- ✅ Support multiple posts from same content (repurposing)
- ✅ Show post history timeline on content items
- ✅ Calculate content ROI (posts per content item)
- ✅ Track platform-specific variations (caption, hashtags, crops)
- ✅ Measure engagement metrics per post
- ✅ Identify top-performing repurposed content

### User Experience
- ✅ Lightbox shows "Post History" panel
- ✅ "Repost to Another Platform" action available
- ✅ Chronological timeline of all posts from one content piece
- ✅ ROI insights: "3 posts from 1 capture = 3x efficiency"
- ✅ Dashboard widget shows content efficiency metrics

### Data Integrity
- ✅ `source_content_id` links all posts to original content
- ✅ Cascade delete: deleting content deletes all associated posts
- ✅ Engagement metrics calculated per post, aggregated for totals
- ✅ Platform-specific metadata preserved

---

## 🎯 Final Recommendation

**INCLUDE content lineage tracking in Phase 4** as essential feature. Here's why:

1. **Answers critical business question:** "Which content is working across platforms?"
2. **Enables ROI measurement:** Team can see 1 video → 3 posts → 16K views
3. **Prevents duplicate work:** See what's already been posted before re-capturing
4. **Cross-platform strategy:** Track how same content performs on Instagram vs. TikTok
5. **Justifies content creation budget:** "These 10 captures generated 32 posts"

**Timeline Impact:**
- **Phase 4 adds:** +4 days (content lineage) + 2.5 days (posting confirmation) = **+6.5 days**
- **Phase 4 new total:** 10.5-14.5 days (was 4-8 days)
- **Overall timeline:** 31-43 days (was 25-35 days)
- **Total impact:** +6.5 days (+20% increase)

**This investment delivers:**
- Complete content lifecycle tracking (capture → post → repurpose)
- Data-driven content strategy insights
- Proof of marketing ROI for label/financiers
- Professional-grade content management system

**Verdict:** Essential for demonstrating content value and preventing wasted effort. The repurposing tracking is what separates amateur vs. professional content operations.
