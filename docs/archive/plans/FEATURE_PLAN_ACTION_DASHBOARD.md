# Feature Implementation Plan: Action Dashboard & UX Enhancements

**Consultant Recommendations Analysis & Technical Implementation Plan**

**Date:** October 9, 2025
**Status:** Pending Approval
**Estimated Timeline:** 2-3 weeks for full implementation

---

## 📋 Executive Summary

The consultant identified 3 key UX improvements that align perfectly with our existing infrastructure:

1. **At-a-Glance Action Dashboard** - Priority inbox approach
2. **Inline Content Preview & Quick Actions** - Lightbox and hover interactions
3. **Smart Deadline Visualization** - Color-coded urgency and countdown timers

**Feasibility Assessment:** ✅ **All 3 features are technically feasible** with our current stack (React Router 7, Radix UI, Cloudflare D1). No new infrastructure required.

**Recommendation:** Implement in **3 phases** with Phase 1 delivering immediate value.

---

## 🎯 Feature 1: At-a-Glance Action Dashboard

### Consultant's Vision

```
┌─────────────────────────────────────────────────────┐
│ ⚡ Action Required (3)                              │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ⏰ HIGH PRIORITY - Due in 3 days            │   │
│ │ Marketing Campaign: 2 videos still needed   │   │
│ │ Current: 4/6 videos (67%)                   │   │
│ │ [Upload Now ➜] [Remind Me Tomorrow]        │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ❌ BLOCKING RELEASE                         │   │
│ │ Master has 2 unacknowledged feedback notes  │   │
│ │ You must review before milestone completion │   │
│ │ [Review Notes ➜] [Mark All Reviewed]       │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Technical Analysis

**✅ Data Already Available:**
- Milestone status and due dates (`milestones` table)
- Content quota progress (calculated via `milestone_content_requirements`)
- File notes acknowledgment status (`files.notes_acknowledged`)
- Budget overspend warnings (calculated in `getBudgetAlerts()`)
- Cleared-for-release status (calculated in `checkClearedForRelease()`)
- Overdue milestone detection (already implemented in `project.$id.tsx:128-134`)

**✅ Infrastructure Exists:**
- Dialog/Modal system (Radix UI `app/components/ui/dialog.tsx`)
- Card components for action items (`app/components/ui/card.tsx`)
- Badge components for severity (`app/components/ui/badge.tsx`)
- Routing system for deep links (React Router 7)

**🔨 What Needs Building:**

#### 1.1 Action Items API Handler

**File:** `workers/api-handlers/actions.ts` (NEW)

**Purpose:** Centralized logic to detect all action-requiring items

```typescript
export interface ActionItem {
  id: string;
  type: 'content_quota' | 'notes_unacknowledged' | 'budget_warning' | 'milestone_overdue' | 'proof_required';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_url: string;
  action_label: string;
  dismissible: boolean;
  metadata: {
    milestone_id?: string;
    file_id?: string;
    days_until_due?: number;
    quota_progress?: { current: number; required: number };
    // etc.
  };
}

export async function getProjectActions(
  db: D1Database,
  projectId: string
): Promise<{ actions: ActionItem[]; count: number }> {
  const actions: ActionItem[] = [];

  // 1. Check content quotas for incomplete milestones
  const incompleteM ilestones = await db.prepare(`
    SELECT m.*,
           (SELECT COUNT(*) FROM milestone_content_requirements WHERE milestone_id = m.id) as req_count
    FROM milestones m
    WHERE m.project_id = ? AND m.status != 'complete'
  `).bind(projectId).all();

  for (const milestone of incompleteMilestones.results) {
    // Check if quota met (reuse existing logic)
    // If not met + due soon → create action item
  }

  // 2. Check unacknowledged notes
  const filesWithNotes = await db.prepare(`
    SELECT f.id, f.storage_key, COUNT(fn.id) as note_count
    FROM files f
    JOIN file_notes fn ON fn.file_id = f.id
    WHERE f.project_id = ? AND f.notes_acknowledged = 0
    GROUP BY f.id
  `).bind(projectId).all();

  if (filesWithNotes.results.length > 0) {
    actions.push({
      type: 'notes_unacknowledged',
      severity: 'high',
      // ... action details
    });
  }

  // 3. Check budget warnings
  // 4. Check overdue milestones
  // 5. Check proof required for blocking milestones

  // Sort by severity + urgency
  actions.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return { actions, count: actions.length };
}
```

**Complexity:** Medium (reuses existing queries, just aggregates them)
**Timeline:** 2-3 days

#### 1.2 Action Dashboard API Route

**File:** `workers/routes/actions.ts` (NEW)

```typescript
app.get('/projects/:projectId/actions', async (c) => {
  const { projectId } = c.req.param();
  const { getProjectActions } = await import('../api-handlers/actions');

  const data = await getProjectActions(c.env.DB, projectId);
  return c.json(data);
});
```

**Complexity:** Low (standard route pattern)
**Timeline:** 1 hour

#### 1.3 ActionDashboard Component

**File:** `app/components/ActionDashboard.tsx` (NEW)

```typescript
interface ActionDashboardProps {
  projectId: string;
  sticky?: boolean; // For sticky top bar vs. full page view
}

export function ActionDashboard({ projectId, sticky = false }: ActionDashboardProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/projects/${projectId}/actions`)
      .then(res => res.json())
      .then(data => setActions(data.actions));
  }, [projectId]);

  const visibleActions = actions.filter(a => !dismissed.has(a.id));

  if (sticky) {
    // Compact top bar: "⚠️ 3 actions required [View →]"
    return <StickyActionBar count={visibleActions.length} />;
  }

  // Full dashboard view
  return (
    <div className="space-y-4">
      {visibleActions.map(action => (
        <ActionCard
          key={action.id}
          action={action}
          onDismiss={() => setDismissed(prev => new Set([...prev, action.id]))}
        />
      ))}
    </div>
  );
}
```

**Features:**
- ✅ Severity-based sorting (high → medium → low)
- ✅ Direct action buttons (deep links to relevant pages)
- ✅ Dismissal (localStorage-based, per-session)
- ✅ "Remind me tomorrow" (stores timestamp in localStorage)
- ✅ Sticky top bar variant (collapsible)

**Complexity:** Medium (state management, conditional rendering)
**Timeline:** 3-4 days

#### 1.4 Integration Points

**Update:** `app/routes/project.$id.tsx`

Add action dashboard above 4-card overview:

```typescript
<div className="space-y-8">
  {/* NEW: Action Dashboard */}
  <ActionDashboard projectId={project.id} />

  {/* Existing: Overview Cards */}
  <div className="grid md:grid-cols-4 gap-6">
    {/* ... existing cards ... */}
  </div>
</div>
```

**Complexity:** Low (drop-in component)
**Timeline:** 1 hour

### Feature 1 Total Estimate

| Task | Complexity | Timeline |
|------|------------|----------|
| 1.1 Actions API Handler | Medium | 2-3 days |
| 1.2 Actions API Route | Low | 1 hour |
| 1.3 ActionDashboard Component | Medium | 3-4 days |
| 1.4 Integration | Low | 1 hour |
| **Total** | **Medium** | **5-7 days** |

---

## 🎨 Feature 2: Inline Content Preview & Quick Actions

### Consultant's Vision

```
Content Library View with Quick Actions:

┌──────┐ ┌──────┐ ┌──────┐
│ 📷   │ │ 📷   │ │ 🎥   │
│      │ │      │ │      │  ← Hover shows actions
│      │ │[✏️][🗑️]│ │      │
└──────┘ └─[👁️]─┘ └──────┘
         └─────┘
         Preview | Edit | Delete
```

### Technical Analysis

**✅ Data Already Available:**
- Content items with metadata (`content_items` table)
- File storage keys for R2 retrieval
- Presigned URLs for downloads (`workers/utils/r2SignedUrls.ts`)

**✅ Infrastructure Exists:**
- Dialog system for lightbox (`app/components/ui/dialog.tsx`)
- R2 file retrieval (direct binding + presigned URLs)
- Card/hover interactions (CSS + Radix UI)

**🔨 What Needs Building:**

#### 2.1 Content Lightbox Component

**File:** `app/components/ContentLightbox.tsx` (NEW)

```typescript
interface ContentLightboxProps {
  contentItem: ContentItem;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ContentLightbox({ contentItem, open, onClose }: ContentLightboxProps) {
  const [mediaUrl, setMediaUrl] = useState('');

  useEffect(() => {
    if (open) {
      // Fetch presigned URL for content item
      fetch(`/api/content/${contentItem.id}/url`)
        .then(res => res.json())
        .then(data => setMediaUrl(data.url));
    }
  }, [open, contentItem.id]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        {/* Image or Video player based on content_type */}
        {contentItem.content_type === 'photo' && (
          <img src={mediaUrl} alt="Content preview" className="w-full" />
        )}
        {contentItem.content_type.includes('video') && (
          <video src={mediaUrl} controls className="w-full" />
        )}

        {/* Metadata display */}
        <div className="mt-4 space-y-2">
          <p><strong>Context:</strong> {contentItem.capture_context}</p>
          <p><strong>Caption:</strong> {contentItem.caption_draft || 'No caption'}</p>
          <p><strong>Platforms:</strong> {contentItem.intended_platforms || 'Not specified'}</p>
        </div>

        {/* Quick actions */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline">Edit Caption</Button>
          <Button>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Complexity:** Low-Medium (leverages existing Dialog)
**Timeline:** 2-3 days

#### 2.2 Presigned URL API Route

**File:** `workers/routes/content.ts` (UPDATE)

Add new endpoint:

```typescript
app.get('/content/:contentId/url', async (c) => {
  const { contentId } = c.req.param();

  // Get content item
  const content = await c.env.DB.prepare(`
    SELECT storage_key FROM content_items WHERE id = ?
  `).bind(contentId).first();

  if (!content) return c.json({ error: 'Not found' }, 404);

  // Generate presigned URL
  const { generatePresignedUrl } = await import('../utils/r2SignedUrls');
  const url = await generatePresignedUrl(
    c.env.BUCKET,
    content.storage_key as string,
    c.env.R2_ACCESS_KEY_ID,
    c.env.R2_SECRET_ACCESS_KEY,
    c.env.R2_ACCOUNT_ID
  );

  return c.json({ url });
});
```

**Complexity:** Low (reuses existing presigned URL logic)
**Timeline:** 1-2 hours

#### 2.3 Hover Actions Overlay

**File:** `app/components/ContentCard.tsx` (UPDATE existing or NEW)

```typescript
export function ContentCard({ content, onPreview, onEdit, onDelete }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <img src={content.thumbnail_url} alt="Content" />

      {/* Hover overlay */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
          <Button size="sm" onClick={() => onPreview(content)}>
            👁️ Preview
          </Button>
          <Button size="sm" variant="outline" onClick={() => onEdit(content)}>
            ✏️ Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(content)}>
            🗑️ Delete
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Complexity:** Low (CSS hover + state management)
**Timeline:** 1-2 days

#### 2.4 Integration: Content Library Page

**Update:** `app/routes/project.$id.content.tsx`

Replace existing content grid with new ContentCard + Lightbox:

```typescript
const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

return (
  <div className="grid grid-cols-3 gap-4">
    {contentItems.map(item => (
      <ContentCard
        key={item.id}
        content={item}
        onPreview={setSelectedContent}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    ))}
  </div>

  <ContentLightbox
    contentItem={selectedContent}
    open={!!selectedContent}
    onClose={() => setSelectedContent(null)}
  />
);
```

**Complexity:** Low (component replacement)
**Timeline:** 2 hours

### Feature 2 Total Estimate

| Task | Complexity | Timeline |
|------|------------|----------|
| 2.1 Content Lightbox Component | Low-Medium | 2-3 days |
| 2.2 Presigned URL API Route | Low | 1-2 hours |
| 2.3 Hover Actions Overlay | Low | 1-2 days |
| 2.4 Integration | Low | 2 hours |
| **Total** | **Medium** | **4-6 days** |

---

## ⏰ Feature 3: Smart Deadline Visualization & Alerts

### Consultant's Vision

```
┌─────────────────────────────────────────────────────┐
│ 🔴 Recording Complete (2 days OVERDUE) ⚡           │
│    ├─ 2/3 videos (1 missing) ⏰ UPLOAD TODAY        │
│    └─ 10/10 photos ✅                               │
│                                                     │
│ 🟠 Mixing Complete (Due in 3 days)                 │
│    ⚠️  Can't start until Recording is complete      │
│                                                     │
│ 🟢 Mastering Complete (Due in 15 days) ✅          │
└─────────────────────────────────────────────────────┘
```

### Technical Analysis

**✅ Data Already Available:**
- Milestone due dates and status (`milestones` table)
- Overdue detection logic (already in `project.$id.tsx`)
- Content quota progress (calculated)
- Blocking relationship (`milestones.blocks_release`)

**✅ Infrastructure Exists:**
- Milestone list/table rendering
- Badge components for status
- Timeline Gantt chart (`app/components/MilestoneGantt.tsx`)

**🔨 What Needs Building:**

#### 3.1 Urgency Calculation Utility

**File:** `app/utils/milestoneUrgency.ts` (NEW)

```typescript
export type UrgencyLevel = 'overdue' | 'critical' | 'warning' | 'normal' | 'complete';

export function calculateMilestoneUrgency(milestone: Milestone): {
  level: UrgencyLevel;
  daysRemaining: number;
  color: string;
  icon: string;
  message: string;
} {
  const now = new Date();
  const dueDate = new Date(milestone.due_date);
  const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (milestone.status === 'complete') {
    return {
      level: 'complete',
      daysRemaining: 0,
      color: 'text-green-600 bg-green-50 border-green-500',
      icon: '✅',
      message: 'Complete'
    };
  }

  if (daysRemaining < 0) {
    return {
      level: 'overdue',
      daysRemaining,
      color: 'text-red-600 bg-red-50 border-red-500 animate-pulse',
      icon: '🔴',
      message: `${Math.abs(daysRemaining)} days OVERDUE`
    };
  }

  if (daysRemaining <= 3) {
    return {
      level: 'critical',
      daysRemaining,
      color: 'text-orange-600 bg-orange-50 border-orange-500 font-bold',
      icon: '🟠',
      message: `Due in ${daysRemaining} days`
    };
  }

  if (daysRemaining <= 7) {
    return {
      level: 'warning',
      daysRemaining,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-500',
      icon: '🟡',
      message: `Due in ${daysRemaining} days`
    };
  }

  return {
    level: 'normal',
    daysRemaining,
    color: 'text-gray-600 bg-white border-gray-300',
    icon: '⚪',
    message: `Due in ${daysRemaining} days`
  };
}
```

**Complexity:** Low (calculation logic)
**Timeline:** 1-2 hours

#### 3.2 Enhanced Milestone Card Component

**File:** `app/components/MilestoneCard.tsx` (NEW)

```typescript
export function MilestoneCard({ milestone, contentQuota }: MilestoneCardProps) {
  const urgency = calculateMilestoneUrgency(milestone);

  return (
    <Card className={`border-l-4 ${urgency.color}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{urgency.icon}</span>
            <CardTitle>{milestone.name}</CardTitle>
          </div>
          <Badge className={urgency.color}>
            {urgency.message}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Content quota progress */}
        {contentQuota && (
          <div className="space-y-2">
            {contentQuota.requirements.map(req => (
              <div key={req.content_type}>
                <div className="flex justify-between text-sm">
                  <span>{req.content_type.replace('_', ' ')}</span>
                  <span className={req.met ? 'text-green-600' : 'text-red-600'}>
                    {req.actual}/{req.required} {req.met ? '✅' : `(${req.missing} missing) ⏰`}
                  </span>
                </div>
                <Progress value={(req.actual / req.required) * 100} />
              </div>
            ))}
          </div>
        )}

        {/* Blocking warning */}
        {milestone.blocks_release === 1 && milestone.status !== 'complete' && (
          <Alert className="mt-3 border-red-500">
            <AlertDescription>
              ⚠️ This milestone blocks release. Must be completed before distribution.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

**Complexity:** Low-Medium (combines existing patterns)
**Timeline:** 2-3 days

#### 3.3 Update MilestoneGantt Component

**File:** `app/components/MilestoneGantt.tsx` (UPDATE)

Add urgency-based coloring to timeline bars:

```typescript
const urgency = calculateMilestoneUrgency(milestone);

return (
  <div
    className={`milestone-bar ${urgency.color}`}
    style={{ /* ... position ... */ }}
  >
    <span className="text-xs">{urgency.icon} {milestone.name}</span>
    <span className="text-xs font-bold">{urgency.message}</span>
  </div>
);
```

**Complexity:** Low (add styling to existing component)
**Timeline:** 1-2 days

#### 3.4 Countdown Timer Component

**File:** `app/components/CountdownTimer.tsx` (NEW)

```typescript
export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000 * 60); // Update every minute

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="text-center">
      <div className="text-3xl font-bold">{timeLeft.days}</div>
      <div className="text-sm text-muted-foreground">days</div>
      <div className="text-xs">{timeLeft.hours}h {timeLeft.minutes}m</div>
    </div>
  );
}
```

**Complexity:** Low (timer logic)
**Timeline:** 1 day

#### 3.5 Integration: Dashboard & Milestone Pages

**Update:** `app/routes/project.$id.tsx` and `app/routes/milestone.$id.tsx`

Replace existing milestone displays with enhanced MilestoneCard:

```typescript
<div className="space-y-4">
  {milestones.map(milestone => (
    <MilestoneCard
      key={milestone.id}
      milestone={milestone}
      contentQuota={quotaData[milestone.id]}
    />
  ))}
</div>
```

**Complexity:** Low (component replacement)
**Timeline:** 1-2 hours

### Feature 3 Total Estimate

| Task | Complexity | Timeline |
|------|------------|----------|
| 3.1 Urgency Calculation Utility | Low | 1-2 hours |
| 3.2 Enhanced Milestone Card | Low-Medium | 2-3 days |
| 3.3 Update MilestoneGantt | Low | 1-2 days |
| 3.4 Countdown Timer | Low | 1 day |
| 3.5 Integration | Low | 1-2 hours |
| **Total** | **Medium** | **5-7 days** |

---

## 📊 Overall Implementation Summary

### Timeline Breakdown

| Feature | Complexity | Timeline | Priority |
|---------|------------|----------|----------|
| **Feature 1: Action Dashboard** | Medium | 5-7 days | HIGH |
| **Feature 2: Content Preview** | Medium | 4-6 days | MEDIUM |
| **Feature 3: Smart Deadlines** | Medium | 5-7 days | MEDIUM |
| **Total (Parallel Development)** | Medium | **2-3 weeks** | - |
| **Total (Sequential Development)** | Medium | **3-4 weeks** | - |

### Phased Rollout Recommendation

**Phase 1: Action Dashboard (Week 1)**
- Highest impact on daily workflow
- Reduces page navigation overhead
- Delivers immediate value

**Phase 2: Smart Deadlines (Week 2)**
- Builds on Phase 1 (actions reference urgency)
- Visual enhancement to existing features
- Medium complexity

**Phase 3: Content Preview (Week 3)**
- Polish feature, not critical path
- Improves UX but doesn't block workflows
- Can be refined based on user feedback

---

## ✅ Technical Feasibility Assessment

### Infrastructure Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| Database queries | ✅ Existing | All data already captured |
| API routes | ✅ Pattern exists | Follow existing Hono patterns |
| UI components | ✅ Available | Radix UI Dialog, Card, Badge |
| File storage access | ✅ Implemented | R2 presigned URLs working |
| State management | ✅ React hooks | Standard useState/useEffect |
| Routing | ✅ React Router 7 | Deep linking supported |
| Real-time updates | ⚠️ Polling | No WebSockets (acceptable for MVP) |

**No blockers identified.** All features can be built with existing infrastructure.

---

## 🚧 Implementation Risks & Mitigation

### Risk 1: Action Detection Performance
**Issue:** Calculating all actions on every page load could be slow
**Mitigation:**
- Cache action results for 5 minutes (in-memory or D1)
- Load actions async after page render (skeleton placeholder)
- Index milestone due dates for faster overdue queries

### Risk 2: Content Preview File Size
**Issue:** Large video files (up to 100MB) may timeout in lightbox
**Mitigation:**
- Show loading spinner during presigned URL generation
- Add timeout handling (30 second limit)
- Offer "Download instead" fallback for large files

### Risk 3: Urgency Color Overload
**Issue:** Too many red/orange indicators could cause alert fatigue
**Mitigation:**
- Limit "overdue" pulsing animation to top 3 priorities
- Use progressive disclosure (collapsed view by default)
- Add filter to hide completed/non-urgent milestones

---

## 📦 Dependencies & Prerequisites

### New NPM Packages Required
**None.** All features use existing dependencies:
- Radix UI (already installed)
- React Router 7 (already installed)
- Tailwind CSS (already installed)

### Database Changes Required
**None.** All necessary data already captured:
- Milestone due dates, status, blocking flags ✅
- Content requirements and progress ✅
- File notes acknowledgment ✅
- Budget category allocations ✅

### Configuration Changes
**None.** No new environment variables or secrets needed.

---

## 🧪 Testing Strategy

### Feature 1: Action Dashboard
- **Unit:** Test action detection logic (overdue, quota unmet, notes)
- **Integration:** Test API `/projects/:id/actions` endpoint
- **E2E:** Playwright test verifying action cards render and deep links work

### Feature 2: Content Preview
- **Unit:** Test presigned URL generation
- **Integration:** Test `/content/:id/url` endpoint returns valid URL
- **E2E:** Playwright test clicking thumbnail → lightbox opens → video plays

### Feature 3: Smart Deadlines
- **Unit:** Test urgency calculation (overdue, critical, warning thresholds)
- **Integration:** Test milestone API includes urgency metadata
- **E2E:** Playwright test verifying color-coded milestones render correctly

---

## 💡 Additional Recommendations (Out of Scope)

These ideas emerged from the analysis but are **not part of the current proposal**:

1. **"Remind Me Tomorrow" Persistence** - Store dismissals in database (currently localStorage-only)
2. **Email/SMS Notifications** - Send action alerts via external service (requires new infrastructure)
3. **Batch Actions** - "Mark all notes as reviewed" across multiple files (nice-to-have)
4. **Content Comparison View** - Side-by-side preview of 2-3 items (consultant mentioned, medium effort)
5. **"What If" Simulator** - Predict impact of completing milestone today (complex, requires dependency graph)

---

## 🎯 Success Criteria

**Feature 1: Action Dashboard**
- ✅ Users see all urgent actions in one place
- ✅ < 2 clicks to address any action (deep links work)
- ✅ Action count badge appears on dashboard
- ✅ Dismissal persists for current session

**Feature 2: Content Preview**
- ✅ Clicking thumbnail opens lightbox in < 1 second
- ✅ Video plays in-browser (no download required)
- ✅ Hover overlay appears within 200ms
- ✅ Edit/Delete actions work from overlay

**Feature 3: Smart Deadlines**
- ✅ Overdue milestones visually distinct (red + pulsing)
- ✅ Countdown timers update in real-time
- ✅ Urgency colors match consultant mockup (🔴🟠🟡🟢)
- ✅ Blocking milestones clearly labeled

---

## 📝 Next Steps for Approval

**Please review and confirm:**

1. **Priority order** - Agree with Phase 1 (Action Dashboard) → Phase 2 (Smart Deadlines) → Phase 3 (Content Preview)?
2. **Timeline** - 2-3 weeks acceptable for all 3 features?
3. **Scope adjustments** - Any features to add/remove from this plan?
4. **Testing requirements** - E2E tests for all 3 features sufficient?

**Upon approval, development begins immediately with Phase 1.**

---

**Prepared by:** Claude Code (AI Assistant)
**Date:** October 9, 2025
**Status:** ⏳ Awaiting Approval
