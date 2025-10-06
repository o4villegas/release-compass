# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Release Compass is a music release management platform for label-funded artists that enforces structured workflows and content capture requirements. The platform prevents project failure by requiring artists to capture marketing content during the creative process—artists cannot complete production milestones without meeting content quotas.

**Tech Stack:** 100% Cloudflare (Workers, Pages, D1, R2)
- Backend: Hono on Cloudflare Workers
- Frontend: React Router 7 (SPA mode) + shadcn/ui + Tailwind CSS
- Database: Cloudflare D1 (SQLite)
- Storage: Cloudflare R2 (S3-compatible)
- Build: Vite with Cloudflare plugin

**Primary Users:** Funded artist teams (artist, manager, producer, content manager)
**Primary Customer:** Label/financier viewing project health

## Development Workflow & Pillars

### Core Development Process
All development follows this mandatory workflow:

1. **Investigation** - Analyze existing code, gather empirical evidence
2. **Plan Development** - Create detailed implementation plan based on evidence
3. **Approval** - Present plan for review and validation
4. **Implementation** - Execute approved plan with precision
5. **Testing** - Verify functionality at all layers (unit, integration, e2e)

### MANDATORY CONFIDENCE CHECKLIST
Before proceeding with any implementation, verify 100% confidence in ALL items:

- ✅ Plan based ONLY on empirical evidence from code analysis (zero assumptions)
- ✅ Plan necessity validated (no duplication of existing functionality)
- ✅ Plan designed for this specific project's architecture and constraints
- ✅ Plan complexity appropriate (neither over/under-engineered)
- ✅ Plan addresses full stack considerations (data layer, business logic, presentation, APIs)
- ✅ Plan includes appropriate testing strategy (unit, integration, e2e/Playwright as needed)
- ✅ Plan maximizes code reuse through enhancement vs. new development
- ✅ Plan includes code organization, cleanup, and documentation requirements
- ✅ Plan considers system-wide impact (routing, state management, data flow)
- ✅ Plan ensures complete feature delivery without shortcuts or placeholders
- ✅ Plan contains only validated assumptions with explicit confirmation sources

**If ANY item cannot be checked with 100% confidence, STOP and investigate further.**

## Deployment Process

**CRITICAL: Never deploy directly to Cloudflare.**

### Git-Based Deployment Workflow
This project uses **automated deployment via GitHub**. All changes follow this process:

1. **Development**: Make changes locally on feature branches
2. **Commit**: Commit changes to local git repository
3. **Push**: Push commits to GitHub repository
4. **Auto-Deploy**: GitHub triggers automatic deployment to Cloudflare Workers

```bash
# Typical workflow
git checkout -b feature/milestone-api
# ... make changes ...
git add .
git commit -m "Add milestone completion API with content quota validation"
git push origin feature/milestone-api
# Open pull request on GitHub
# After merge to main → automatic deployment
```

### What NOT to Do
❌ **DO NOT** run `npm run deploy` manually
❌ **DO NOT** run `wrangler deploy` directly
❌ **DO NOT** use `wrangler publish`
❌ **DO NOT** make changes directly in Cloudflare dashboard

### Deployment Verification
After GitHub auto-deploys:
1. Check GitHub Actions for deployment status
2. Verify changes in Cloudflare Workers dashboard (read-only)
3. Test deployed endpoints/features
4. Monitor Cloudflare observability logs

## Development Commands

### Local Development
```bash
npm run dev                # Start local dev server at http://localhost:5173
npm run build             # Build for production (used by CI/CD only)
npm run typecheck         # Run TypeScript type checking
npm run cf-typegen        # Generate Cloudflare Workers types
npm run preview           # Preview production build locally
# npm run deploy          # ⚠️ DO NOT USE - Deployment is automated via GitHub
```

### Cloudflare Resource Management
```bash
# D1 Database
wrangler d1 create music_releases_db
wrangler d1 migrations apply music_releases_db
wrangler d1 migrations apply music_releases_db --remote  # Production

# R2 Storage
wrangler r2 bucket create music-release-files
wrangler r2 bucket list

# Secrets Management
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_ACCOUNT_ID
```

### Database Migrations
- Migration files live in `migrations/` directory (SQL files)
- Run migrations locally: `wrangler d1 migrations apply music_releases_db`
- Run migrations in production: add `--remote` flag
- D1 supports standard SQLite syntax including `ON CONFLICT` (upsert), foreign keys, and indexes

## Architecture

### High-Level Structure

```
release-compass/
├── app/                    # React Router frontend (SPA)
│   ├── routes/            # Page routes
│   ├── root.tsx           # Root layout with error boundary
│   └── routes.ts          # Route configuration
├── workers/               # Cloudflare Workers backend
│   └── app.ts            # Hono app with API routes
├── migrations/            # D1 database migrations (SQL)
├── wrangler.jsonc        # Cloudflare Workers configuration
└── vite.config.ts        # Vite build configuration
```

### Data Flow

1. **Frontend (React Router SPA)**
   - Routes defined in `app/routes.ts`
   - React components in `app/` directory
   - Uses shadcn/ui components (should be in `app/components/ui/`)
   - Styled with Tailwind CSS v4

2. **Backend (Hono API)**
   - Entry point: `workers/app.ts`
   - API routes should be added before the catch-all `app.get("*")` handler
   - Access Cloudflare bindings via `c.env` (D1, R2, secrets)
   - All API routes should be under `/api/*` prefix

3. **Database (D1)**
   - SQLite database accessed via D1 binding
   - Query with prepared statements: `c.env.DB.prepare(sql).bind(...).run()`
   - Supports transactions, foreign keys, indexes

4. **Storage (R2)**
   - S3-compatible object storage
   - Direct access via binding: `c.env.BUCKET.put(key, data)`
   - Presigned URLs for downloads using `aws4fetch` library

### Core Data Model

**Projects** - Main project entity (artist release)
- Contains: artist_name, release_title, release_date, total_budget
- Has many: milestones, budget_items, files, content_items

**Milestones** - Production checkpoints with due dates
- Status: pending, in_progress, complete, overdue
- Content requirements: milestone_content_requirements (minimum counts per content type)
- Critical feature: Cannot complete milestone without meeting content quota
- Proof required for financial milestones (distributor uploads, playlist submissions)

**Content Items** - Marketing content captured during production
- Types: short_video, photo, voice_memo, long_video, live_performance
- Capture contexts: recording_session, mixing_session, mastering_session, rehearsal, etc.
- Linked to milestones for quota enforcement
- Tracks posting status and platform distribution

**Files** - Production files (masters, stems, artwork, receipts)
- User-input metadata required (ISRC, UPC/EAN, credits)
- Timestamp notes for audio file feedback
- Notes must be acknowledged by uploader before milestone completion

**Budget Items** - Expense tracking
- Categories: production, marketing, distribution, admin, content_creation, contingency
- Receipts required (stored in R2)

**Alerts** - Automated risk detection
- Generated daily via cron trigger
- Unique alert_key prevents duplicates
- Dismissible but persistent (once dismissed, doesn't re-create)

### Identity System

**UUID-based identity (no traditional auth for MVP)**
- UUID generated client-side using `crypto.randomUUID()` (Web Standard API)
- Stored in localStorage, persists across sessions
- User provides display name separately
- All API actions include `userUuid` in request body
- File acknowledgment restricted to uploader by UUID check

## Critical Implementation Rules

### Content Quota Enforcement
**THE BREAKTHROUGH FEATURE - NEVER COMPROMISE THIS**

```typescript
// Before marking milestone complete:
1. Validate content quota is met (compare actual vs required per content_type)
2. For Recording/Mixing/Mastering milestones: Check all audio files have notes_acknowledged = 1
3. For financial milestones: Check proof_file exists
4. Return specific error codes (QUOTA_NOT_MET, NOTES_NOT_ACKNOWLEDGED, PROOF_REQUIRED)
```

Implementation: `src/worker/utils/contentQuota.ts` - validateContentQuota()

### File Size Limits (Cloudflare Free Tier: 100MB request limit)
```
Photos: 10MB max
Short videos: 50MB max
Long videos: 100MB max (at Cloudflare limit)
Audio files: 100MB max (at Cloudflare limit)
Receipts: 10MB max
Artwork: 10MB max
```

**ALWAYS validate file size client-side before upload** - Show friendly error:
"Your video is 73MB but the limit is 50MB. Please compress before uploading."

### Image Validation (Client-Side Only)
Workers don't support Image/createImageBitmap APIs. Image validation (dimensions, aspect ratio) **must be done in the browser** before upload.

```typescript
// Client-side validation for artwork
const img = new Image();
img.onload = () => {
  if (img.width < 3000 || img.height < 3000) {
    // Show error
  }
  const aspectRatio = img.width / img.height;
  if (Math.abs(aspectRatio - 1) > 0.01) {
    // Show error - must be square
  }
};
img.src = URL.createObjectURL(file);
```

### R2 Presigned URLs
Use `aws4fetch` library (official Cloudflare recommendation):

```typescript
import { AwsClient } from 'aws4fetch';

const client = new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  service: 's3',
  region: 'auto'
});

// Generate presigned URL for downloads (uploads go direct via binding)
const url = new URL(`https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`);
url.searchParams.set('X-Amz-Expires', '3600');
const signed = await client.sign(new Request(url, { method: 'GET' }), { aws: { signQuery: true } });
return signed.url;
```

### Standardized Error Responses
Use consistent error codes throughout the API:

```typescript
const ErrorCodes = {
  QUOTA_NOT_MET: { code: 'QUOTA_NOT_MET', status: 422, userMessage: '...' },
  NOTES_NOT_ACKNOWLEDGED: { code: 'NOTES_NOT_ACKNOWLEDGED', status: 422, userMessage: '...' },
  FILE_TOO_LARGE: { code: 'FILE_TOO_LARGE', status: 413, userMessage: '...' },
  PROOF_REQUIRED: { code: 'PROOF_REQUIRED', status: 422, userMessage: '...' },
  RECEIPT_REQUIRED: { code: 'RECEIPT_REQUIRED', status: 422, userMessage: '...' }
};
```

Frontend should check error codes and display appropriate modals/warnings.

### Metadata Validation
ISRC and UPC/EAN codes have specific formats - validate with regex:

```typescript
ISRC: /^[A-Z]{2}-?\w{3}-?\d{2}-?\d{5}$/  // Example: US-S1Z-99-00001
UPC:  /^\d{12}$/                          // Example: 123456789012
EAN:  /^\d{13}$/                          // Example: 1234567890123
```

Show real-time validation feedback in metadata form.

### Audio Player with Timeline Notes
Use `plyr-react` for audio playback with custom overlay for timestamp markers:

```typescript
import Plyr from 'plyr-react';

// Features:
- Click timeline to add note at current time
- Display markers for existing notes on timeline
- Jump to timestamp when clicking note
- "Acknowledge Feedback" button (only visible to file uploader via UUID check)
- File cannot be used for milestone completion until notes acknowledged
```

### Budget Categories and Allocation
6 categories with recommended percentages:
1. Production: 35%
2. Marketing: 30%
3. **Content Creation: 10%** (separate from marketing)
4. Distribution: 10%
5. Admin: 10%
6. Contingency: 5%

Alerts trigger at >115% (WARNING) and >130% (CRITICAL) of allocation.

### Alert System
- Generated by scheduled worker (cron): `src/worker/scheduled.ts`
- Cron trigger configured in `wrangler.jsonc`: `"crons": ["0 9 * * *"]`
- Each alert has unique `alert_key` to prevent duplicates
- Dismissible via API but persists as "dismissed" (doesn't re-create)
- Alert types: missed_deadline, budget_overrun, content_quota_risk, marketing_underspend

## Key API Patterns

### Hono Route Structure
```typescript
// workers/app.ts
import { Hono } from "hono";

const app = new Hono();

// Add API routes BEFORE the catch-all React Router handler
app.post('/api/projects', async (c) => {
  const db = c.env.DB;
  const bucket = c.env.BUCKET;
  // ... implementation
});

// Catch-all for React Router SPA (ALWAYS LAST)
app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );
  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});
```

### D1 Query Patterns
```typescript
// Prepared statements with binding
const result = await c.env.DB.prepare(
  'SELECT * FROM projects WHERE id = ?'
).bind(projectId).first();

// Upsert (ON CONFLICT is supported in D1)
await c.env.DB.prepare(`
  INSERT INTO users (id, user_uuid, name, created_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_uuid) DO UPDATE SET name = excluded.name
`).bind(id, uuid, name, timestamp).run();
```

### R2 Upload via Binding (Server-Side)
```typescript
// Direct upload in Worker (no presigned URL needed)
const file = body.file as File; // From Hono's c.req.parseBody()
await c.env.BUCKET.put(storageKey, file.stream());
```

### React Router Loader Pattern
```typescript
// app/routes/project-dashboard.tsx
export async function loader({ params, context }: Route.LoaderArgs) {
  const { projectId } = params;
  const response = await fetch(`/api/projects/${projectId}`);
  const project = await response.json();
  return { project };
}

export default function ProjectDashboard({ loaderData }: Route.ComponentProps) {
  const { project } = loaderData;
  return <div>{project.release_title}</div>;
}
```

## Common Pitfalls to Avoid

❌ **DON'T** allow milestone completion without content quota met
❌ **DON'T** allow milestone completion with unacknowledged file notes (for production milestones)
❌ **DON'T** allow budget submissions without receipts
❌ **DON'T** accept files exceeding size limits (validate client-side)
❌ **DON'T** try to validate images server-side (use client-side Image API)
❌ **DON'T** use localStorage/sessionStorage in server code (only in client components)
❌ **DON'T** add routes after the catch-all `app.get("*")` handler

✅ **DO** validate content quota before marking milestones complete
✅ **DO** check file notes acknowledged for Recording/Mixing/Mastering milestones
✅ **DO** validate file sizes client-side with friendly error messages
✅ **DO** use `crypto.randomUUID()` for ID generation (no package needed)
✅ **DO** use standardized error codes (ErrorCodes)
✅ **DO** add API routes before the React Router catch-all
✅ **DO** use Hono's `c.req.parseBody()` for multipart uploads

## Dependencies

### Already Installed
- `hono` - Backend API framework
- `react-router` - Frontend routing
- Standard React/Vite tooling

### Need to Install (from development guide)
```bash
npm install aws4fetch plyr-react
```

- `aws4fetch` - R2 presigned URL generation (Cloudflare-recommended)
- `plyr-react` - Audio player with custom controls

### shadcn/ui Components
Install components as needed:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
# etc.
```

## Testing Strategy

### Manual Test Workflows
1. Create project → auto-generates milestones with quotas ✓
2. Upload content → quota progress updates ✓
3. Try to complete milestone without quota → blocked with specific error ✓
4. Upload remaining content → milestone completes successfully ✓
5. Upload audio file → add timestamp notes → try to complete milestone → blocked ✓
6. Acknowledge notes → milestone can complete ✓
7. Check cleared-for-release status updates ✓
8. Dismiss alert → alert persists but marked dismissed ✓

### Creating Test Data
Use `scripts/seed-demo.ts` to create realistic demo projects with:
- Partially completed milestones (2/3 videos uploaded)
- Audio files with unacknowledged notes
- Budget items showing overspend in one category
- One teaser posted (needs 2)

## MVP Scope Constraints

**Single-project, single-team view**
- For demo, show artist team interface
- Label executives see same interface (read-only explained verbally)
- No multi-project portfolio (post-MVP)
- No authentication (UUID-based identity only)

**Cloudflare Free Tier Limits**
- 100MB request limit accepted as demo limitation
- Large file uploads will fail - show friendly errors
- Consider adding compression suggestions in UI

## Reference: Detailed Development Roadmap

The file `development_guide.md` contains the complete implementation roadmap with:
- Phase 1: Foundation setup (D1, R2, identity system)
- Phase 2: Core API routes (projects, milestones, content, budget)
- Phase 3: Frontend views (dashboard, content library, audio player)
- Phase 4: Content quota enforcement logic
- Phase 5: Alert system and dashboard
- Phase 6: Polish and testing

Refer to this file for detailed implementation steps, code examples, and SQL schema.

**Note on Deployment:** The development guide contains a "Phase 7: Deployment" section with manual `wrangler deploy` commands. **Ignore this section.** Deployment is automated via GitHub as described in the Deployment Process section above.

## Support Resources

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Hono Framework: https://hono.dev/
- React Router v7: https://reactrouter.com/
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/
