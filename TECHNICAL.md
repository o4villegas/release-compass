# Technical Documentation - Release Compass

**Developer Setup & Architecture Reference**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Cloudflare account (free tier works)
- Git installed

### Local Development Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd release-compass

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# Server runs at: http://localhost:5173
```

---

## 🏗️ Tech Stack

**100% Cloudflare Infrastructure**
- **Backend:** Hono (v4.8.2) on Cloudflare Workers
- **Frontend:** React Router 7 (SPA mode) + React 19
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 (S3-compatible object storage)
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS v4
- **Build Tool:** Vite 6.3.6 with Cloudflare plugin
- **Deployment:** Automated via GitHub Actions

---

## 📦 Project Structure

```
release-compass/
├── app/                        # React Router frontend (SPA)
│   ├── routes/                # Page components with loaders
│   │   ├── home.tsx          # Landing page
│   │   ├── create-project.tsx # Project creation form
│   │   ├── project.$id.tsx   # Project dashboard
│   │   ├── milestone.$id.tsx # Milestone detail view
│   │   ├── project.$id.*.tsx # Feature pages (budget, content, files, etc.)
│   │   └── _app-layout.tsx   # Shared layout wrapper
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── modals/           # Modal dialogs
│   │   ├── widgets/          # Dashboard widgets
│   │   └── skeletons/        # Loading states
│   ├── utils/                # Client-side utilities
│   ├── root.tsx              # Root layout with error boundary
│   └── routes.ts             # Route configuration
│
├── workers/                   # Cloudflare Workers backend
│   ├── app.ts                # Hono server entry point
│   ├── routes/               # API route handlers
│   │   ├── projects.ts       # Projects CRUD
│   │   ├── milestones.ts     # Milestone operations
│   │   ├── content.ts        # Content upload/tracking
│   │   ├── files.ts          # File management
│   │   ├── budget.ts         # Budget tracking
│   │   └── teasers.ts        # Teaser tracking
│   ├── api-handlers/         # Reusable business logic
│   │   ├── projects.ts       # getProjectDetails()
│   │   ├── milestones.ts     # getMilestoneDetails()
│   │   ├── budget.ts         # getProjectBudget(), getBudgetAlerts()
│   │   ├── files.ts          # getProjectFiles()
│   │   └── teasers.ts        # getProjectTeasers()
│   └── utils/                # Server-side utilities
│       ├── clearedForRelease.ts      # Release validation logic
│       ├── milestoneTemplates.ts     # Auto-generation templates
│       ├── fileValidation.ts         # File size/type validation
│       └── r2SignedUrls.ts           # Secure download URLs
│
├── migrations/                # D1 database migrations
│   └── 001_initial_schema.sql # Database schema
│
├── tests/                     # Playwright E2E tests
│   ├── e2e/                  # Test suites
│   └── UI_ELEMENTS_REFERENCE.md # Selector documentation
│
├── public/                    # Static assets
├── wrangler.jsonc            # Cloudflare Workers config
├── vite.config.ts            # Vite build config
├── package.json              # Dependencies
├── CLAUDE.md                 # AI assistant instructions
├── IMPLEMENTATION_STATUS_REPORT.md # Detailed status
└── README.md                 # Main documentation (stakeholder-focused)
```

---

## 🗄️ Database Setup

### Initial Setup (Local)

```bash
# Create D1 database
wrangler d1 create music_releases_db

# Apply migrations locally
wrangler d1 migrations apply music_releases_db

# View local database
wrangler d1 execute music_releases_db --command "SELECT * FROM projects"
```

### Production Setup

```bash
# Apply migrations to production
wrangler d1 migrations apply music_releases_db --remote
```

### Database Schema

**11 Tables:**
- `projects` - Main project entity
- `milestones` - Production checkpoints
- `milestone_content_requirements` - Content quotas per milestone
- `content_items` - Marketing content
- `files` - Production files (masters, stems, artwork, receipts)
- `file_notes` - Timestamp notes on audio files
- `budget_items` - Expense tracking
- `teaser_posts` - Social media teaser tracking
- `users` - UUID-based identity
- `alerts` - (Unused in MVP - out of scope)

**7 Performance Indexes** on critical queries

See `migrations/001_initial_schema.sql` for full schema.

---

## 💾 R2 Storage Setup

```bash
# Create R2 bucket
wrangler r2 bucket create music-release-files

# List buckets
wrangler r2 bucket list

# Configure CORS (if needed)
wrangler r2 bucket cors put music-release-files --rules cors-config.json
```

### Set R2 Secrets

```bash
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_ACCOUNT_ID
```

---

## 🔧 Development Commands

```bash
# Local development
npm run dev                    # Start dev server (http://localhost:5173)

# Type checking
npm run typecheck              # Run TypeScript type checker

# Build
npm run build                  # Production build (for CI/CD)

# Preview
npm run preview                # Preview production build locally

# Cloudflare types
npm run cf-typegen             # Generate Cloudflare Workers types

# Testing
npx playwright test            # Run all E2E tests
npx playwright test --ui       # Interactive test UI
npx playwright test --headed   # Run tests with visible browser
```

---

## 🚢 Deployment

**IMPORTANT: Never deploy manually. Deployment is automated via GitHub Actions.**

### How Deployment Works

1. **Push to GitHub** - Commit changes to `main` branch
2. **GitHub Actions Triggers** - Automatic workflow runs
3. **Build & Deploy** - Vite builds frontend + backend bundle
4. **Cloudflare Workers** - Deploys to edge network globally

### What NOT to Do

❌ `npm run deploy` - Don't run manually
❌ `wrangler deploy` - Don't run directly
❌ `wrangler publish` - Don't use

### Verify Deployment

```bash
# Check health endpoint
curl https://release-compass.lando555.workers.dev/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-09T...","version":"1.0.0"}
```

---

## 📡 API Reference

### Base URL
- **Local:** `http://localhost:5173/api`
- **Production:** `https://release-compass.lando555.workers.dev/api`

### Key Endpoints

**Projects:**
- `POST /api/projects` - Create project (auto-generates 11 milestones)
- `GET /api/projects/:id` - Get project with milestones
- `GET /api/projects/:id/cleared-for-release` - Check release readiness

**Milestones:**
- `GET /api/milestones/:id` - Get milestone details
- `POST /api/milestones/:id/complete` - Mark complete (validates quota)
- `GET /api/milestones/:milestoneId/content-status` - Get quota progress

**Content:**
- `POST /api/content/upload` - Upload marketing content
- `GET /api/projects/:projectId/content` - Get all content

**Files:**
- `POST /api/files/upload` - Upload production files
- `GET /api/projects/:projectId/files` - Get files by project
- `POST /api/files/:fileId/notes` - Add timestamp note
- `POST /api/files/:fileId/acknowledge-notes` - Acknowledge feedback

**Budget:**
- `POST /api/budget-items` - Add expense (requires receipt)
- `GET /api/projects/:projectId/budget` - Get budget breakdown
- `GET /api/projects/:projectId/budget/alerts` - Get overspend warnings

**Teasers:**
- `POST /api/teasers` - Log teaser post
- `GET /api/projects/:projectId/teasers` - Get teasers with requirement status

See `workers/routes/` for detailed implementations.

---

## 🎨 Frontend Architecture

### React Router 7 Patterns

**Loader Pattern (SSR-safe):**
```typescript
export async function loader({ params, context }: Route.LoaderArgs) {
  // CORRECT: Direct DB access via handlers
  const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };
  const { getProjectDetails } = await import("../../workers/api-handlers/projects");
  const data = await getProjectDetails(env.env.DB, params.id);

  if (!data) throw new Response("Not found", { status: 404 });
  return data;
}

// WRONG: HTTP fetch (causes SSR errors)
const response = await fetch(`/api/projects/${id}`);
```

**Component Pattern:**
```typescript
export default function ProjectDashboard({ loaderData }: Route.ComponentProps) {
  const { project, milestones } = loaderData;

  return (
    <div className="container mx-auto py-8">
      <h1>{project.release_title}</h1>
      {/* ... */}
    </div>
  );
}
```

### Key Components

**shadcn/ui Components Used:**
- Button, Card, Input, Label, Select, Checkbox
- Dialog, Alert, Badge, Progress, Tabs, Table
- Skeleton (loading states)

**Custom Components:**
- `MilestoneGantt` - Timeline visualization
- `AudioPlayer` - Plyr.js with timeline notes
- `ContentUpload` - Multi-step upload flow
- `ContentQuotaWidget` - Dashboard widget
- `EmptyState` - Consistent empty UI
- `QuotaNotMetModal` - Blocking modal
- `NotesNotAcknowledgedModal` - Feedback warning

---

## 🔐 Authentication (MVP)

**Current System: UUID-based (no auth)**

```typescript
// Client-side (localStorage)
const userUuid = localStorage.getItem('user_uuid') || crypto.randomUUID();
localStorage.setItem('user_uuid', userUuid);

// All API requests include userUuid in body
await fetch('/api/files/upload', {
  method: 'POST',
  body: JSON.stringify({ ...data, user_uuid: userUuid })
});
```

**Limitation:** Anyone with project URL can access. Demo-only.

---

## 🧪 Testing

### E2E Tests (Playwright)

```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test tests/e2e/interactive-ui-complete.spec.ts

# Run with visible browser
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Interactive UI
npx playwright test --ui
```

### Test Files
- `visual-demo.spec.ts` - Visual demo with console logging
- `interactive-ui-complete.spec.ts` - Full workflow test
- `production-smoke-test.spec.ts` - Quick health check

### UI Testing Reference
See `tests/UI_ELEMENTS_REFERENCE.md` for:
- Radix UI selector patterns
- Component text labels
- EmptyState usage patterns

---

## 🐛 Common Issues

### Issue: "Cannot find module" errors
**Fix:** Run `npm install` and `npm run cf-typegen`

### Issue: D1 database not found locally
**Fix:** Run `wrangler d1 migrations apply music_releases_db`

### Issue: CORS errors in local development
**Fix:** Add CORS middleware in `workers/app.ts` (already configured)

### Issue: File uploads fail (413 error)
**Cause:** File exceeds 100MB Cloudflare limit
**Fix:** Client-side validation before upload

### Issue: SSR "Oops!" errors on page load
**Cause:** Loader using `fetch()` instead of direct DB access
**Fix:** Use handler pattern from `project.$id.budget.tsx`

---

## 📊 Monitoring & Observability

### Production Monitoring

**Cloudflare Dashboard:**
- Workers Analytics: Request volume, error rates
- D1 Analytics: Query performance
- R2 Analytics: Storage usage, bandwidth

**Health Check:**
```bash
curl https://release-compass.lando555.workers.dev/api/health
```

**Logs:**
```bash
wrangler tail          # Stream production logs
wrangler tail --format pretty
```

---

## 🔧 Configuration Files

### `wrangler.jsonc`
```jsonc
{
  "name": "release-compass",
  "compatibility_date": "2024-12-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "music_releases_db",
      "database_id": "..."
    }
  ],
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "music-release-files"
    }
  ]
}
```

### `vite.config.ts`
- Configures Cloudflare plugin for Workers
- Sets up SPA mode for React Router
- Handles static asset optimization

---

## 📚 Additional Resources

**Project Documentation:**
- `README.md` - Main documentation (stakeholder-focused)
- `CLAUDE.md` - AI assistant instructions & patterns
- `IMPLEMENTATION_STATUS_REPORT.md` - Detailed feature status

**External Documentation:**
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [React Router v7](https://reactrouter.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)

---

## 🤝 Contributing

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes, commit
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push origin feature/new-feature

# Open pull request on GitHub
# After merge to main → automatic deployment
```

### Commit Message Format
```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: improve code structure
test: add test coverage
```

---

## 📞 Support

**For technical issues:**
- Check `CLAUDE.md` for implementation patterns
- Review `IMPLEMENTATION_STATUS_REPORT.md` for known issues
- Check Cloudflare Workers logs: `wrangler tail`

**For business/feature questions:**
- See main `README.md` for feature overview
- Contact via repository owner

---

**Last Updated:** October 9, 2025
**Version:** 1.0 (MVP)
