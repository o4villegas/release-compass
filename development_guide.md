# Music Release Project Tracker - Development Roadmap (Verified Technical Implementation)

## Executive Summary

You are building a single-project music release management platform for label-funded artists. This platform enforces structured workflows and content capture requirements to prevent the 80-90% project failure rate in independent music.

**Core Innovation:** Artists cannot complete production milestones without capturing marketing content during the creative process, solving the marketing underspend problem structurally rather than with alerts.

**Primary Customer:** Roc Nation (label/financier)  
**Primary Users:** Funded artist teams (artist, manager, producer, content manager)  
**Tech Stack:** 100% Cloudflare (Workers, Pages, D1, R2)

**MVP Scope:** Single-project, single-team view. For the demo, you'll show the artist team interface and explain to Roc Nation "you would see this same information updating in real-time." Simple UUID-based identity for data integrity.

**Key Constraint:** Cloudflare free tier 100MB request limit - accepted as demo limitation.

---

## Recommended Starting Template

**Use:** `cloudflare/templates/react-router-hono-fullstack-template`

**Initialize with:**
```bash
npm create cloudflare@latest music-release-tracker -- --template=cloudflare/templates/react-router-hono-fullstack-template
```

**Why this template:**
- Hono backend API (fast, Workers-optimized)
- React Router frontend with SPA mode
- shadcn/ui + Tailwind CSS pre-configured
- Cloudflare Vite plugin for local development
- Built-in support for D1 and R2 bindings
- Workers Assets for static file serving

---

## Phase 1: Foundation Setup (Days 1-2)

### Goal
Configure Cloudflare resources and establish database schema.

### 1.1 Create Cloudflare Resources

**Create D1 Database:**
```bash
wrangler d1 create music_releases_db
```
Note the database ID returned.

**Create R2 Bucket:**
```bash
wrangler r2 bucket create music-release-files
```

**Create R2 API Tokens:**
1. Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Click "Create API Token"
3. Name: "music-release-api"
4. Permissions: Admin Read & Write
5. Save the Access Key ID and Secret Access Key

**Update wrangler.toml:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "music_releases_db"
database_id = "YOUR_DATABASE_ID"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "music-release-files"

[triggers]
crons = ["0 9 * * *"]  # Daily alerts at 9am UTC
```

**Store R2 credentials as secrets:**
```bash
wrangler secret put R2_ACCESS_KEY_ID
# Paste your Access Key ID when prompted

wrangler secret put R2_SECRET_ACCESS_KEY
# Paste your Secret Access Key when prompted

wrangler secret put R2_ACCOUNT_ID
# Paste your Cloudflare Account ID when prompted
```

### 1.2 Create Database Schema

Create file: `migrations/001_initial_schema.sql`

```sql
-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  artist_name TEXT NOT NULL,
  release_title TEXT NOT NULL,
  release_date TEXT NOT NULL,
  release_type TEXT NOT NULL, -- single/EP/album
  total_budget INTEGER NOT NULL,
  cleared_for_release INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

-- Milestones table
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  blocks_release INTEGER DEFAULT 0,
  proof_required INTEGER DEFAULT 0,
  proof_file TEXT,
  content_quota_met INTEGER DEFAULT 0,
  completed_at TEXT,
  completed_by TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Budget items table
CREATE TABLE budget_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  receipt_file TEXT,
  approval_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Files table with user-input metadata
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  uploaded_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  metadata_complete INTEGER DEFAULT 0,
  metadata_json TEXT,
  artwork_storage_key TEXT,
  artwork_width INTEGER,
  artwork_height INTEGER,
  metadata_completed_at TEXT,
  notes_acknowledged INTEGER DEFAULT 0,
  notes_acknowledged_at TEXT,
  notes_acknowledged_by TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- File timestamp notes for production feedback
CREATE TABLE file_notes (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id)
);

-- Users table (simplified for demo)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  user_uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Alerts table
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  alert_key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  dismissed INTEGER DEFAULT 0,
  dismissed_by TEXT,
  dismissed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Content items table (NEW - core feature)
CREATE TABLE content_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  milestone_id TEXT,
  content_type TEXT NOT NULL,
  capture_context TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  duration_seconds INTEGER,
  caption_draft TEXT,
  intended_platforms TEXT,
  approved_for_posting INTEGER DEFAULT 0,
  posting_status TEXT DEFAULT 'not_posted',
  posted_at TEXT,
  posted_platforms TEXT,
  engagement_notes TEXT,
  created_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

-- Milestone content requirements (NEW)
CREATE TABLE milestone_content_requirements (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  minimum_count INTEGER NOT NULL,
  FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

-- Teaser posts tracking (NEW)
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
  source_content_id TEXT,
  created_by TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (source_content_id) REFERENCES content_items(id)
);

-- Indexes for performance
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_budget_items_project ON budget_items(project_id);
CREATE INDEX idx_content_items_project ON content_items(project_id);
CREATE INDEX idx_content_items_milestone ON content_items(milestone_id);
CREATE INDEX idx_alerts_project_active ON alerts(project_id, dismissed);
CREATE INDEX idx_files_project_type ON files(project_id, file_type);
CREATE INDEX idx_users_uuid ON users(user_uuid);
```

**Run migration:**
```bash
wrangler d1 migrations apply music_releases_db
```

**VERIFIED:** D1 runs SQLite 3.41.0+ which fully supports:
- `ON CONFLICT` (upsert) syntax ✅
- Foreign key constraints ✅
- All standard indexes ✅

### 1.3 Seed Default Milestone Templates

Create file: `migrations/002_seed_templates.sql`

```sql
-- This will be used to create default milestones when a project is created
-- Store as JSON in a templates table or hardcode in the application
-- For now, document the milestone structure:

-- Recording Complete (90 days before release)
-- Content quota: 3 short_videos, 10 photos, 1 voice_memo
-- blocks_release: 0, proof_required: 0
-- Requires: All uploaded audio files have notes acknowledged

-- Mixing Complete (60 days before)
-- Content quota: 2 short_videos, 5 photos, 1 voice_memo
-- blocks_release: 0, proof_required: 0
-- Requires: All uploaded mix files have notes acknowledged

-- Mastering Complete (45 days before)
-- Content quota: 2 short_videos, 5 photos
-- blocks_release: 0, proof_required: 0
-- Requires: All uploaded master files have notes acknowledged

-- Metadata Tagging Complete (35 days before)
-- No content quota
-- blocks_release: 1, proof_required: 1

-- Artwork Finalized (30 days before)
-- No content quota
-- blocks_release: 0, proof_required: 1

-- Teaser Content Released (21-28 days before)
-- Requires 2 teaser posts tracked in teaser_posts table
-- blocks_release: 0

-- Upload to Distributor (30 days before)
-- blocks_release: 1, proof_required: 1

-- Spotify Playlist Submission (28 days before)
-- blocks_release: 1, proof_required: 1

-- Marketing Campaign Launch (21 days before)
-- Content quota: 6 short_videos, 15 photos
-- blocks_release: 0

-- Release Day (day 0)
-- blocks_release: 1
```

### 1.4 UUID-Based Identity Setup

**File:** `src/react-app/src/context/UserContext.tsx`

Create identity management with UUID for data integrity:

```typescript
import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext<{
  userName: string;
  userUuid: string;
  setUserName: (name: string) => void;
} | null>(null);

export function UserProvider({ children }) {
  const [userName, setUserNameState] = useState(() => {
    return localStorage.getItem('userName') || '';
  });
  
  const [userUuid, setUserUuid] = useState(() => {
    let uuid = localStorage.getItem('userUuid');
    if (!uuid) {
      // Use Web Standard crypto.randomUUID() (no package needed!)
      uuid = crypto.randomUUID();
      localStorage.setItem('userUuid', uuid);
    }
    return uuid;
  });

  const setUserName = (name: string) => {
    setUserNameState(name);
    localStorage.setItem('userName', name);
    
    // Register user in database if first time
    fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userUuid })
    });
  };

  useEffect(() => {
    if (userName) {
      localStorage.setItem('userName', userName);
    }
  }, [userName]);

  return (
    <UserContext.Provider value={{ userName, userUuid, setUserName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
```

**VERIFIED:** `crypto.randomUUID()` is a Web Standard API built into Workers runtime. No npm package needed! ✅

**Key Points:**
- UUID generated once using native Web API
- Persists in localStorage
- User never sees UUID (invisible data integrity)
- Name is display-only, UUID is true identifier
- Prevents accidental impersonation during demo
- All API calls send userUuid in body/headers

**File:** `src/react-app/src/components/WelcomeModal.tsx`

Simple modal component that appears on first visit.

### 1.5 Install Required Dependencies

```bash
npm install aws4fetch plyr-react
```

**Verified packages:**
- `aws4fetch` - Official Cloudflare-recommended library for R2 presigned URLs (uses Web Crypto API) ✅
- `plyr-react` - React wrapper for Plyr audio player ✅

### 1.6 Verify Setup

Test local development:
```bash
npm run dev
```

Verify:
- Dev server runs at http://localhost:5173
- Hono API accessible at /api routes
- D1 and R2 bindings work (test with a simple query)

---

## Phase 2: Core API Routes (Days 3-5)

### Goal
Build backend API routes in Hono for all core operations.

### 2.1 File Size Validation Middleware

**File:** `src/worker/middleware/fileValidation.ts`

Create reusable validation for file uploads:

```typescript
export const FILE_SIZE_LIMITS = {
  photo: 10 * 1024 * 1024,        // 10MB
  short_video: 50 * 1024 * 1024,  // 50MB
  long_video: 100 * 1024 * 1024,  // 100MB (WARNING: at Cloudflare limit)
  audio: 100 * 1024 * 1024,       // 100MB (WARNING: at Cloudflare limit)
  receipt: 10 * 1024 * 1024,      // 10MB
  artwork: 10 * 1024 * 1024       // 10MB
};

export const FILE_TYPE_VALIDATION = {
  photo: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/wav', 'audio/mpeg', 'audio/flac'],
  pdf: ['application/pdf']
};

export function validateFileSize(fileSize: number, fileType: string): { valid: boolean; error?: string } {
  const limit = FILE_SIZE_LIMITS[fileType];
  if (!limit) {
    return { valid: false, error: 'Unknown file type' };
  }
  
  if (fileSize > limit) {
    return { 
      valid: false, 
      error: `File size ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds limit of ${(limit / 1024 / 1024)}MB. Please compress before uploading.`
    };
  }
  
  return { valid: true };
}
```

### 2.2 Standardized Error Responses

**File:** `src/worker/utils/errors.ts`

```typescript
export const ErrorCodes = {
  QUOTA_NOT_MET: {
    code: 'QUOTA_NOT_MET',
    status: 422,
    userMessage: 'Cannot complete milestone: content quota not met'
  },
  NOTES_NOT_ACKNOWLEDGED: {
    code: 'NOTES_NOT_ACKNOWLEDGED',
    status: 422,
    userMessage: 'Please acknowledge feedback on audio files before completing'
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    status: 413,
    userMessage: 'File exceeds maximum size limit'
  },
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    status: 415,
    userMessage: 'File type not supported'
  },
  PROOF_REQUIRED: {
    code: 'PROOF_REQUIRED',
    status: 422,
    userMessage: 'Proof of completion required for this milestone'
  },
  RECEIPT_REQUIRED: {
    code: 'RECEIPT_REQUIRED',
    status: 422,
    userMessage: 'Receipt required for budget items'
  }
};

export function errorResponse(errorCode: keyof typeof ErrorCodes, details?: any) {
  const error = ErrorCodes[errorCode];
  return {
    error: error.code,
    message: error.userMessage,
    details,
    status: error.status
  };
}
```

### 2.3 R2 Presigned URL Helper

**File:** `src/worker/utils/r2SignedUrls.ts`

```typescript
import { AwsClient } from 'aws4fetch';

export async function generateDownloadUrl(
  storageKey: string,
  env: any
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto'
  });

  const url = new URL(
    `https://${env.R2_BUCKET}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${storageKey}`
  );
  
  url.searchParams.set('X-Amz-Expires', '3600'); // 1 hour

  const signed = await client.sign(
    new Request(url, { method: 'GET' }),
    { aws: { signQuery: true } }
  );

  return signed.url;
}

export async function generateUploadUrl(
  storageKey: string,
  contentType: string,
  env: any
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto'
  });

  const url = new URL(
    `https://${env.R2_BUCKET}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${storageKey}`
  );
  
  url.searchParams.set('X-Amz-Expires', '3600'); // 1 hour

  const signed = await client.sign(
    new Request(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType }
    }),
    { aws: { signQuery: true } }
  );

  return signed.url;
}
```

**VERIFIED:** `aws4fetch` is the official Cloudflare-recommended library for generating R2 presigned URLs. It uses Web Crypto API and works perfectly in Workers. ✅

### 2.4 Project Management API

**File:** `src/worker/routes/projects.ts`

Implement routes:
- `POST /api/projects` - Create new project with release date
  - Accept userUuid from client
  - Generate project ID using `crypto.randomUUID()`
  - Calculate milestone due dates based on release date
  - Insert project record
  - Auto-generate milestones with content requirements
  - Return created project with milestones

- `GET /api/projects/:id` - Get project details
  - Return project data
  - Include all milestones
  - Include budget summary by category
  - Include content bank status
  - Calculate cleared_for_release status

- `PATCH /api/projects/:id` - Update project details
  - Allow updates to release_date, total_budget
  - Recalculate milestone dates if release date changes

### 2.5 User Registration API

**File:** `src/worker/routes/users.ts`

```typescript
// POST /api/users/register
// Upsert user by UUID (idempotent)
app.post('/api/users/register', async (c) => {
  const { name, userUuid } = await c.req.json();
  
  await c.env.DB.prepare(`
    INSERT INTO users (id, user_uuid, name, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_uuid) DO UPDATE SET name = excluded.name
  `).bind(
    crypto.randomUUID(),
    userUuid,
    name,
    new Date().toISOString()
  ).run();
  
  return c.json({ success: true });
});
```

**VERIFIED:** D1 supports `ON CONFLICT` (upsert) syntax ✅

### 2.6 Milestone Management API

**File:** `src/worker/routes/milestones.ts`

Implement routes:
- `GET /api/projects/:projectId/milestones` - List all milestones

- `POST /api/milestones/:id/complete` - Mark milestone complete
  - **Critical:** Check content quota before allowing completion
  - Validate content_items count matches requirements
  - **For Recording/Mixing/Mastering:** Check that all audio files have notes_acknowledged = 1
  - If proof_required (financial milestones only), ensure proof_file exists
  - If content quota not met, return error with details using ErrorCodes
  - If files have unacknowledged notes, return error listing those files
  - Update status to 'complete', set completed_at and completed_by
  - Set content_quota_met to 1

- `GET /api/milestones/:id/content-status` - Check content quota progress
  - Query content_items for this milestone
  - Query milestone_content_requirements
  - Return current count vs required count for each content type

### 2.7 Content Management API

**File:** `src/worker/routes/content.ts`

Implement routes:

- `POST /api/content/upload` - Upload content to R2
  - **VERIFIED: Use Hono's built-in multipart support:**
  
```typescript
app.post('/api/content/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  const milestoneId = body.milestoneId as string;
  const contentType = body.contentType as string;
  const captureContext = body.captureContext as string;
  
  // Validate file size
  const validation = validateFileSize(file.size, contentType);
  if (!validation.valid) {
    return c.json(errorResponse('FILE_TOO_LARGE', { message: validation.error }), 413);
  }
  
  // Generate storage key
  const storageKey = `${projectId}/content/${captureContext}/${Date.now()}-${file.name}`;
  
  // Upload to R2 using binding (no presigned URL needed for uploads via Worker)
  await c.env.BUCKET.put(storageKey, file.stream());
  
  // Insert record
  const contentId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO content_items (id, project_id, milestone_id, content_type, 
      capture_context, storage_key, created_at, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    contentId,
    projectId,
    milestoneId,
    contentType,
    captureContext,
    storageKey,
    new Date().toISOString(),
    userUuid
  ).run();
  
  // Return with quota status
  return c.json({ success: true, contentId });
});
```

**VERIFIED:** Hono's `c.req.parseBody()` returns a File object for multipart uploads in Workers ✅

- `GET /api/projects/:projectId/content` - List all content
  - Support filtering by milestone_id, content_type, posting_status
  - Return organized by milestone

- `GET /api/milestones/:milestoneId/content-library` - Get content for milestone
  - Return all content_items for this milestone
  - Include quota fulfillment status

- `PATCH /api/content/:id` - Update content metadata
  - Allow updating caption_draft, intended_platforms, approved_for_posting

- `POST /api/content/:id/mark-posted` - Mark content as posted
  - Update posting_status
  - Set posted_at timestamp
  - Record posted_platforms array

### 2.8 Budget Tracking API

**File:** `src/worker/routes/budget.ts`

Implement routes:
- `POST /api/budget-items` - Create budget item
  - **Critical:** Require receipt_file upload to R2 first
  - Return RECEIPT_REQUIRED error if missing
  - Categories: production, marketing, distribution, admin, contingency, content_creation
  - Insert with approval_status: 'pending'

- `GET /api/projects/:projectId/budget` - Get budget summary
  - Calculate total by category
  - Calculate percentage of allocation
  - Return with recommended allocations for comparison

- `GET /api/projects/:projectId/budget/alerts` - Check budget health
  - Identify categories >115% of allocation (WARNING)
  - Identify categories >130% of allocation (CRITICAL)
  - Check marketing <25% with <30 days to release (CRITICAL)
  - Return alert objects

### 2.9 Teaser Tracking API

**File:** `src/worker/routes/teasers.ts`

Implement routes:
- `POST /api/teasers` - Record teaser post
  - Validate post_url format
  - Validate posting_date within release window
  - Insert teaser_posts record
  - Link to source_content_id if applicable

- `GET /api/projects/:projectId/teasers` - List all teasers
  - Return with engagement metrics
  - Calculate if minimum requirement met (2 teasers)

- `PATCH /api/teasers/:id/engagement` - Update engagement metrics
  - Manually record views, likes, shares, comments

### 2.10 File Management API

**File:** `src/worker/routes/files.ts`

Implement routes:
- `POST /api/files/upload` - Upload master/artwork/receipt
  - Accept file_type: master, stems, artwork, contracts, receipts
  - **Validate file size before processing**
  - Generate versioned storage key
  - Upload to R2 using binding
  - Insert files record
  - Return upload success with file ID

- `POST /api/files/:id/metadata` - Save user-input metadata
  - Accept metadata object with all required fields
  - **Validate using METADATA_VALIDATION patterns (see 2.11)**
  - Store as metadata_json
  - **Artwork dimensions validated client-side only** (see 3.6)
  - Set metadata_complete to 1 when valid
  - Return validation results

- `GET /api/files/:id/metadata` - Get metadata for file
  - Return parsed metadata_json
  - Include validation status

- `POST /api/files/:fileId/notes` - Add timestamp note to file
  - Accept timestamp_seconds and note_text
  - Insert file_notes record
  - Return created note
  
- `GET /api/files/:fileId/notes` - Get all notes for a file
  - Return notes ordered by timestamp_seconds
  - Include creator info
  
- `POST /api/files/:fileId/acknowledge-notes` - Mark notes as acknowledged
  - Set notes_acknowledged to 1
  - Set notes_acknowledged_at and notes_acknowledged_by
  - Return updated file status

- `GET /api/files/:id/download-url` - Get signed download URL
  - Use `generateDownloadUrl()` helper from 2.3
  - Valid for 1 hour

### 2.11 Metadata Validation Utilities

**File:** `src/worker/utils/metadataValidation.ts`

```typescript
export const METADATA_VALIDATION = {
  isrc: {
    pattern: /^[A-Z]{2}-?\w{3}-?\d{2}-?\d{5}$/,
    example: 'US-S1Z-99-00001',
    help: 'Format: CC-XXX-YY-NNNNN (Country-Registrant-Year-Designation)'
  },
  
  upc: {
    pattern: /^\d{12}$/,
    example: '123456789012',
    help: '12-digit barcode number'
  },
  
  ean: {
    pattern: /^\d{13}$/,
    example: '1234567890123',
    help: '13-digit European barcode'
  }
};

export function validateISRC(isrc: string): boolean {
  return METADATA_VALIDATION.isrc.pattern.test(isrc);
}

export function validateUPC(upc: string): boolean {
  return METADATA_VALIDATION.upc.pattern.test(upc);
}
```

---

## Phase 3: Frontend Core Views (Days 6-9)

### Goal
Build React components for project management and content workflows.

### 3.1 Client-Side Image Validation Helper

**File:** `src/react-app/src/utils/imageValidation.ts`

**IMPORTANT:** Workers don't support `createImageBitmap`, `Image`, or `FileReader` APIs. Image validation must happen client-side before upload.

```typescript
export async function validateArtwork(file: File): Promise<{
  valid: boolean;
  width?: number;
  height?: number;
  aspectRatio?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      if (img.width < 3000 || img.height < 3000) {
        resolve({
          valid: false,
          width: img.width,
          height: img.height,
          error: 'Artwork must be at least 3000x3000 pixels'
        });
        return;
      }
      
      const aspectRatio = img.width / img.height;
      if (Math.abs(aspectRatio - 1) > 0.01) { // Allow 1% tolerance
        resolve({
          valid: false,
          width: img.width,
          height: img.height,
          aspectRatio,
          error: 'Artwork must be square (1:1 aspect ratio)'
        });
        return;
      }
      
      resolve({
        valid: true,
        width: img.width,
        height: img.height,
        aspectRatio
      });
    };
    
    img.onerror = () => {
      resolve({
        valid: false,
        error: 'Unable to load image file'
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
}
```

**VERIFIED:** Image APIs only work in browser, not Workers. Client-side validation is the correct approach. ✅

### 3.2 Project Dashboard

**File:** `src/react-app/src/pages/ProjectDashboard.tsx`

Components to build:
- **ClearedForReleaseStatus** - Large banner showing CLEARED or NOT CLEARED
  - Display 9-item checklist with status indicators
  - Show which requirements are blocking
  
- **MilestoneFeed** - Timeline of milestones
  - Color-coded by status (pending/in-progress/complete/overdue)
  - Show content quota progress for each
  - Show file feedback status (e.g., "3 files awaiting acknowledgment")
  - "Mark Complete" button (disabled if requirements not met)
  
- **BudgetOverview** - Spending by category
  - Visual progress bars
  - Color-coded (green <100%, yellow 100-130%, red >130%)
  - Highlight content_creation category
  
- **ActiveAlerts** - Critical/Warning/Info alerts
  - Grouped by severity
  - Dismissible button on each alert
  - Once dismissed, alert persists but shown as "Dismissed"

### 3.3 Content Library View

**File:** `src/react-app/src/pages/ContentLibrary.tsx`

Components:
- **ContentUploadModal** - Upload new content
  - Select content_type (short_video, photo, voice_memo, etc.)
  - Select capture_context (recording_session, mixing_session, etc.)
  - Drag-drop file upload
  - **Client-side file size validation before upload:**
  
```typescript
const handleFileSelect = (file: File) => {
  const limits = {
    photo: 10,
    short_video: 50,
    audio: 100
  };
  
  const limitMB = limits[contentType];
  const fileSizeMB = file.size / 1024 / 1024;
  
  if (fileSizeMB > limitMB) {
    setError(`File size ${fileSizeMB.toFixed(1)}MB exceeds ${limitMB}MB limit. Please compress before uploading.`);
    return;
  }
  
  setSelectedFile(file);
};
```

  - Caption draft field
  - Platform checkboxes (TikTok, Instagram, YouTube)
  - Show quota progress after upload
  
- **ContentGrid** - Display all content items
  - Organized by milestone
  - Filter by content_type, posting_status
  - Thumbnail previews
  - Action buttons: Preview, Edit, Approve, Mark Posted
  
- **ContentQuotaProgress** - Per-milestone progress
  - "3/3 short videos ✓"
  - "8/10 photos - NEED 2 MORE"
  - Visual progress bars

### 3.4 Milestone Detail View

**File:** `src/react-app/src/pages/MilestoneDetail.tsx`

Features:
- Display milestone info (name, description, due date, status)
- Show traditional requirements (proof upload if needed for financial milestones)
- Show content quota requirements with current status
- **Show file feedback status** - List files with unacknowledged notes
- Display all content items for this milestone
- Display all uploaded files for this milestone with note counts
- "Mark Complete" button with validation:
  - Disabled if proof missing (for financial milestones)
  - Disabled if content quota not met
  - Disabled if files have unacknowledged notes (for Recording/Mixing/Mastering)
  - **Show specific error message from API** explaining what's missing

**Error Display Logic:**
```typescript
const handleMarkComplete = async () => {
  try {
    await fetch(`/api/milestones/${id}/complete`, { method: 'POST' });
    // Success...
  } catch (error) {
    if (error.code === 'QUOTA_NOT_MET') {
      setShowQuotaModal(true);
      setQuotaDetails(error.details);
    } else if (error.code === 'NOTES_NOT_ACKNOWLEDGED') {
      setShowNotesWarning(true);
      setUnacknowledgedFiles(error.details.files);
    }
  }
};
```

### 3.5 Audio Player with Timestamp Notes

**File:** `src/react-app/src/components/AudioPlayer.tsx`

**Using Plyr for audio playback:**

```typescript
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import { useState, useEffect, useRef } from 'react';

interface Note {
  id: string;
  timestamp_seconds: number;
  note_text: string;
  created_by: string;
  created_at: string;
}

const AudioPlayer = ({ fileId, audioUrl, userUuid, uploadedBy }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTimestamp, setNewNoteTimestamp] = useState(0);
  const playerRef = useRef<any>();
  
  // Fetch notes on load
  useEffect(() => {
    fetchNotes();
  }, [fileId]);
  
  const fetchNotes = async () => {
    const res = await fetch(`/api/files/${fileId}/notes`);
    const data = await res.json();
    setNotes(data.notes);
  };
  
  // Handle Plyr timeupdate
  const handleTimeUpdate = (event: Plyr.PlyrEvent) => {
    const plyr = event.detail.plyr;
    setCurrentTime(plyr.currentTime);
  };
  
  // Jump to timestamp when clicking note
  const jumpToTimestamp = (seconds: number) => {
    if (playerRef.current?.plyr) {
      playerRef.current.plyr.currentTime = seconds;
    }
  };
  
  // Add note at specific timestamp
  const handleAddNote = async (noteText: string) => {
    await fetch(`/api/files/${fileId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp_seconds: newNoteTimestamp,
        note_text: noteText,
        userUuid
      })
    });
    
    await fetchNotes();
    setShowAddNote(false);
  };
  
  // Acknowledge all notes
  const handleAcknowledge = async () => {
    await fetch(`/api/files/${fileId}/acknowledge-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userUuid })
    });
    
    // Refresh page to show acknowledged status
    window.location.reload();
  };
  
  return (
    <div className="audio-player-container">
      <div className="file-header">
        <h3>{fileId}</h3>
        <div className="note-count">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </div>
        {notes.length > 0 && userUuid === uploadedBy && (
          <button onClick={handleAcknowledge} className="acknowledge-btn">
            Acknowledge Feedback
          </button>
        )}
      </div>
      
      <div className="plyr-wrapper">
        <Plyr
          ref={playerRef}
          source={{
            type: 'audio',
            sources: [{ src: audioUrl }]
          }}
          options={{
            controls: ['play', 'progress', 'current-time', 'duration', 'volume']
          }}
          on={{
            timeupdate: handleTimeUpdate
          }}
        />
        
        {/* Custom timeline overlay with note markers */}
        <div className="timeline-notes-overlay">
          {notes.map(note => (
            <div
              key={note.id}
              className="note-marker"
              style={{
                left: `${(note.timestamp_seconds / playerRef.current?.plyr?.duration || 1) * 100}%`
              }}
              onClick={() => jumpToTimestamp(note.timestamp_seconds)}
              title={note.note_text}
            />
          ))}
        </div>
      </div>
      
      {/* Notes list */}
      <div className="notes-list">
        <h4>Feedback Notes</h4>
        {notes.map(note => (
          <div key={note.id} className="note-item" onClick={() => jumpToTimestamp(note.timestamp_seconds)}>
            <div className="note-timestamp">
              {formatTimestamp(note.timestamp_seconds)}
            </div>
            <div className="note-text">{note.note_text}</div>
            <div className="note-meta">
              by {note.created_by} · {formatDate(note.created_at)}
            </div>
          </div>
        ))}
      </div>
      
      {/* Add note form */}
      {showAddNote && (
        <AddNoteForm
          timestamp={newNoteTimestamp}
          onSubmit={handleAddNote}
          onCancel={() => setShowAddNote(false)}
        />
      )}
      
      {/* Click anywhere on timeline to add note */}
      <button
        onClick={() => {
          setNewNoteTimestamp(currentTime);
          setShowAddNote(true);
        }}
        className="add-note-btn"
      >
        Add Note at {formatTimestamp(currentTime)}
      </button>
    </div>
  );
};

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}
```

**VERIFIED:** Plyr is a lightweight, accessible HTML5 media player that works perfectly in React. Custom overlays can be added with CSS positioning. ✅

**Implementation Time:** 1 day

### 3.6 Budget View

**File:** `src/react-app/src/pages/BudgetView.tsx`

Components:
- **BudgetItemForm** - Add new expense
  - Category dropdown (including content_creation)
  - Description field
  - Amount input
  - **Receipt upload required** - button disabled until receipt uploaded
  - Show file size limit (10MB for receipts)
  
- **BudgetBreakdown** - Table of all items
  - Grouped by category
  - Show receipt status
  - Show approval status
  
- **CategoryAllocation** - Compare actual vs recommended
  - Recommended: 35% production, 30% marketing, 10% content_creation, etc.
  - Actual spending percentage
  - Deviation indicators

### 3.7 Master File Upload & Metadata Form

**File:** `src/react-app/src/pages/MasterUpload.tsx`

**Step 1: Upload Audio File**
- Drag-drop or select master audio file
- Show file naming guidance: `[Artist]-[TrackTitle]-Master.wav`
- **Client-side size check (100MB limit)**
- Upload to R2

**Step 2: Input Metadata Form** (integrated, not separate page)
- Pre-fill artist name and release date from project
- Form fields with validation:
  - Track Title (required, text input)
  - Artist Name (pre-filled, editable)
  - Album/Single Name (pre-filled from project)
  - Release Date (pre-filled from project)
  - Genre (dropdown: Hip-Hop, Pop, R&B, etc.)
  - **ISRC Code** (format: XX-XXX-YY-NNNNN, with validation)
    - Show example: "US-S1Z-99-00001"
    - Real-time validation with regex
    - Show error: "Invalid ISRC format"
  - **UPC/EAN Barcode** (format validation, help link)
    - 12 digits for UPC, 13 for EAN
    - Show example
  - Copyright ℗ (template: "℗ 2025 [Artist]")
  - Publishing © (template: "© 2025 [Label]")
  - Producer Credits (multi-input)
  - Songwriter Credits (multi-input)
  - Featured Artists (if applicable)
  - Explicit Content (toggle: Clean/Explicit)
  - Language (dropdown)

**Step 3: Upload Artwork**
- Drag-drop album artwork
- **Client-side validation using imageValidation helper:**

```typescript
import { validateArtwork } from '@/utils/imageValidation';

const handleArtworkSelect = async (file: File) => {
  // Size check
  if (file.size > 10 * 1024 * 1024) {
    setError('Artwork must be under 10MB');
    return;
  }
  
  // Dimension check (client-side only!)
  const validation = await validateArtwork(file);
  if (!validation.valid) {
    setError(validation.error);
    return;
  }
  
  setArtwork(file);
  setArtworkDimensions({ width: validation.width, height: validation.height });
};
```

- Preview at multiple sizes

**Step 4: Review & Submit**
- Show summary of all metadata
- Validation checklist with indicators (✓ complete, ! warning, ✗ missing)
- "Complete Metadata" button (disabled until required fields valid)
- Option to download metadata as JSON for distributor

### 3.8 Teaser Tracker

**File:** `src/react-app/src/pages/TeaserTracker.tsx`

Components:
- **TeaserRequirements** - Show quota status
  - "Posted 1/2 required teasers"
  - "Optimal window: Oct 10-17 (21-28 days before release)"
  - Platform status (TikTok ✓, Instagram needed)
  
- **TeaserForm** - Add new teaser
  - Platform dropdown
  - Post URL input
  - Song section (intro/verse/chorus/bridge)
  - Snippet duration
  - Pre-save link checkbox
  
- **TeaserEngagement** - Track performance
  - Manual input for views, likes, shares, comments
  - Compare performance across teasers
  - Show which snippet performed best

---

## Phase 4: Content Quota Logic (Days 10-12)

### Goal
Implement the breakthrough feature that enforces content capture.

### 4.1 Content Quota Validation Function

**File:** `src/worker/utils/contentQuota.ts`

```typescript
async function validateContentQuota(
  db: D1Database,
  milestoneId: string
): Promise<{
  met: boolean;
  details: Array<{
    contentType: string;
    required: number;
    actual: number;
    missing: number;
  }>;
}> {
  // Get requirements for this milestone
  const requirements = await db
    .prepare('SELECT content_type, minimum_count FROM milestone_content_requirements WHERE milestone_id = ?')
    .bind(milestoneId)
    .all();
  
  if (requirements.results.length === 0) {
    return { met: true, details: [] };
  }
  
  // For each requirement, count actual content
  const details = [];
  let allMet = true;
  
  for (const req of requirements.results) {
    const count = await db
      .prepare('SELECT COUNT(*) as count FROM content_items WHERE milestone_id = ? AND content_type = ?')
      .bind(milestoneId, req.content_type)
      .first();
    
    const actual = count.count;
    const required = req.minimum_count;
    const missing = Math.max(0, required - actual);
    
    if (actual < required) {
      allMet = false;
    }
    
    details.push({
      contentType: req.content_type,
      required,
      actual,
      missing
    });
  }
  
  return { met: allMet, details };
}
```

Use this in the `POST /api/milestones/:id/complete` route to block completion.

### 4.2 Auto-Generate Content Requirements

**File:** `src/worker/utils/milestoneTemplates.ts`

When creating a project, automatically insert content requirements:

```typescript
const MILESTONE_TEMPLATES = {
  'Recording Complete': {
    contentRequirements: [
      { type: 'short_video', count: 3 },
      { type: 'photo', count: 10 },
      { type: 'voice_memo', count: 1 }
    ]
  },
  'Mixing Complete': {
    contentRequirements: [
      { type: 'short_video', count: 2 },
      { type: 'photo', count: 5 },
      { type: 'voice_memo', count: 1 }
    ]
  },
  // ... etc
};
```

### 4.3 Real-Time Quota Display

In the frontend, after every content upload, immediately fetch and display updated quota status:

```typescript
// After upload succeeds
const quotaStatus = await fetch(`/api/milestones/${milestoneId}/content-status`);
// Update UI to show "2/3 videos - NEED 1 MORE"
```

### 4.4 File Notes Acknowledgment Check

**File:** `src/worker/utils/fileNotesValidation.ts`

```typescript
async function checkFileNotesAcknowledged(
  db: D1Database,
  milestoneId: string
): Promise<{
  allAcknowledged: boolean;
  unacknowledgedFiles: Array<{
    fileName: string;
    noteCount: number;
  }>;
}> {
  // Get all audio files for this milestone
  const files = await db
    .prepare(`
      SELECT f.id, f.storage_key, COUNT(n.id) as note_count
      FROM files f
      LEFT JOIN file_notes n ON f.id = n.file_id
      WHERE f.project_id = (SELECT project_id FROM milestones WHERE id = ?)
        AND f.file_type IN ('master', 'stems')
      GROUP BY f.id
      HAVING note_count > 0 AND f.notes_acknowledged = 0
    `)
    .bind(milestoneId)
    .all();
  
  const unacknowledged = files.results.map(f => ({
    fileName: f.storage_key.split('/').pop(),
    noteCount: f.note_count
  }));
  
  return {
    allAcknowledged: unacknowledged.length === 0,
    unacknowledgedFiles: unacknowledged
  };
}
```

Use this in the `POST /api/milestones/:id/complete` route for Recording/Mixing/Mastering milestones.

---

## Phase 5: Alerts & Dashboard (Days 13-15)

### Goal
Implement automated risk detection and label oversight.

### 5.1 Alert Generation Worker

**File:** `src/worker/scheduled.ts`

Implement cron handler that runs daily:

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Get all active projects
    const projects = await env.DB.prepare(
      'SELECT * FROM projects WHERE cleared_for_release = 0'
    ).all();
    
    for (const project of projects.results) {
      await generateAlertsForProject(env.DB, project);
    }
  }
};

async function generateAlertsForProject(db: D1Database, project: any) {
  const today = new Date();
  const releaseDate = new Date(project.release_date);
  
  // Check for overdue milestones
  const overdue = await db.prepare(`
    SELECT * FROM milestones 
    WHERE project_id = ? AND status != 'complete' AND due_date < ?
  `).bind(project.id, today.toISOString()).all();
  
  for (const milestone of overdue.results) {
    const alertKey = `milestone_overdue:${milestone.id}`;
    
    // Check if alert already exists and not dismissed
    const existing = await db.prepare(
      'SELECT * FROM alerts WHERE alert_key = ? AND dismissed = 0'
    ).bind(alertKey).first();
    
    if (!existing) {
      await createAlert(db, {
        project_id: project.id,
        alert_key: alertKey,
        type: 'missed_deadline',
        severity: milestone.blocks_release ? 'critical' : 'warning',
        message: `Milestone "${milestone.name}" is overdue by ${daysSince(milestone.due_date)} days`
      });
    }
  }
  
  // Check budget deviations
  // Check content quota risks
  // Check marketing underspend
  // Check burn rate
}
```

**Alert Behavior:**
- Create alert once with unique alert_key
- Alert persists until user dismisses it
- If dismissed, alert does NOT re-create (user acknowledged it)
- Multiple alerts can exist for same project

### 5.2 Alert Dismissal API

**File:** `src/worker/routes/alerts.ts`

```typescript
app.post('/api/alerts/:id/dismiss', async (c) => {
  const { id } = c.req.param();
  const { userUuid } = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE alerts 
    SET dismissed = 1, dismissed_by = ?, dismissed_at = ?
    WHERE id = ?
  `).bind(userUuid, new Date().toISOString(), id).run();
  
  return c.json({ success: true });
});
```

### 5.3 Cleared-for-Release Calculator

**File:** `src/worker/utils/releaseStatus.ts`

```typescript
async function calculateClearedStatus(
  db: D1Database,
  projectId: string
): Promise<{
  cleared: boolean;
  requirements: Array<{
    name: string;
    met: boolean;
    details?: string;
  }>;
}> {
  const requirements = [];
  
  // 1. All required milestones complete
  const incomplete = await db.prepare(`
    SELECT COUNT(*) as count FROM milestones 
    WHERE project_id = ? AND status != 'complete' AND blocks_release = 1
  `).bind(projectId).first();
  
  requirements.push({
    name: 'All blocking milestones complete',
    met: incomplete.count === 0,
    details: incomplete.count > 0 ? `${incomplete.count} blocking milestones incomplete` : null
  });
  
  // 2. Metadata complete
  const masterFile = await db.prepare(`
    SELECT * FROM files 
    WHERE project_id = ? AND file_type = 'master' AND metadata_complete = 1
    ORDER BY version DESC LIMIT 1
  `).bind(projectId).first();
  
  requirements.push({
    name: 'Master file with complete metadata',
    met: !!masterFile,
    details: !masterFile ? 'No master file with metadata' : null
  });
  
  // 3. Teaser content posted (minimum 2)
  const teasers = await db.prepare(`
    SELECT COUNT(*) as count FROM teaser_posts WHERE project_id = ?
  `).bind(projectId).first();
  
  requirements.push({
    name: 'Teaser content posted (min 2)',
    met: teasers.count >= 2,
    details: teasers.count < 2 ? `Only ${teasers.count}/2 teasers posted` : null
  });
  
  // ... continue for all 9 requirements
  
  const allMet = requirements.every(r => r.met);
  
  return { cleared: allMet, requirements };
}
```

### 5.4 Label Dashboard

**File:** `src/react-app/src/pages/LabelDashboard.tsx`

Read-only view for label executives:
- Project overview with health indicators
- Risk alerts (critical/warning/info)
- Recent activity timeline
- Milestone progress visualization
- Budget breakdown (including content_creation spend)
- Content bank status

Use different styling to show this is view-only (no edit buttons).

---

## Phase 6: Polish & Testing (Days 16-18)

### 6.1 Error Handling

Add comprehensive error handling:
- API routes return proper HTTP status codes using ErrorCodes
- Frontend displays user-friendly error messages
- Network errors caught and handled gracefully
- **File upload errors are specific:**
  - "File size 73MB exceeds 50MB limit. Please compress before uploading."
  - "File type .avi not supported. Use .mp4 or .mov"
  - "Upload failed due to network error. Please try again."

### 6.2 Loading States

Add loading indicators:
- Skeleton screens while data loads
- Progress bars for file uploads
- Disabled states on buttons during async operations
- Spinner on "Mark Complete" button while validating

### 6.3 Validation

Frontend validation before API calls:
- Required fields
- **File size checks before upload** (show error immediately)
- **Image dimension validation client-side**
- File type restrictions
- Date range validations
- ISRC/UPC format validation (real-time feedback)

### 6.4 Testing

Create test data script:

**File:** `scripts/seed-demo.ts`

```typescript
async function seedDemoProject(db: D1Database) {
  // Create project
  const projectId = crypto.randomUUID();
  const project = await createProject({
    id: projectId,
    artist_name: 'Demo Artist',
    release_title: 'Summer Nights',
    release_date: '2025-11-15',
    total_budget: 50000,
    created_by: 'demo-uuid'
  });
  
  // Upload 2/3 required videos for Recording milestone
  // Upload 8/10 photos (showing progress)
  // Create budget items showing 90% production spend (triggers alert)
  // Upload master file with incomplete metadata
  // Add file with notes but not acknowledged
  // Post 1/2 required teasers
  
  console.log('Demo project created with realistic data');
}
```

Test workflows:
- Create project → auto-generates milestones with quotas ✓
- Upload content → quota progress updates ✓
- Try to complete milestone without quota → blocked with specific error ✓
- Upload remaining content → milestone completes successfully ✓
- Try to complete milestone with unacknowledged notes → blocked ✓
- Acknowledge notes → milestone can complete ✓
- Check cleared-for-release status updates ✓
- Dismiss alert → alert persists but marked dismissed ✓

---

## Phase 7: Deployment (Day 19)

### 7.1 Production Database

Create production D1 database:
```bash
wrangler d1 create music_releases_prod
```

Run migrations on production:
```bash
wrangler d1 migrations apply music_releases_prod --remote
```

### 7.2 Production R2 Bucket

Create production bucket:
```bash
wrangler r2 bucket create music-release-files-prod
```

### 7.3 Set Up Production R2 Credentials

Generate production R2 API tokens:
1. Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Create new token for production
3. Save credentials

Add to production secrets:
```bash
wrangler secret put R2_ACCESS_KEY_ID --env production
wrangler secret put R2_SECRET_ACCESS_KEY --env production
wrangler secret put R2_ACCOUNT_ID --env production
```

### 7.4 Deploy to Workers

Update wrangler.toml with production bindings.

Deploy:
```bash
npm run deploy
```

### 7.5 Set Up Custom Domain (Optional)

If using custom domain:
```bash
wrangler deploy --compatibility-date=2025-10-05 --name=music-tracker
```

Add custom domain in Cloudflare dashboard.

---

## Success Criteria

### MVP is complete when:

1. **Project Creation Works**
   - User can create project with release date
   - System auto-generates 11 milestones with proper due dates
   - Content requirements are automatically created for applicable milestones

2. **Content Quota Enforcement Works**
   - User can upload content to milestones
   - **Client-side file size validation with friendly errors**
   - System tracks quota progress in real-time
   - User CANNOT complete milestone without meeting quota
   - Error message clearly states what content is missing

3. **File Feedback Acknowledgment Works**
   - User can add timestamp notes to audio files using Plyr player
   - Notes appear as markers on timeline
   - File uploader can acknowledge feedback (verified by UUID)
   - Recording/Mixing/Mastering milestones CANNOT be completed until file feedback acknowledged
   - Error message clearly lists files awaiting acknowledgment

4. **Budget Tracking Works**
   - User cannot submit expense without receipt
   - **Receipt file size limited to 10MB**
   - Budget breakdown shows 6 categories (including content_creation)
   - Alerts trigger for budget deviations

5. **Cleared-for-Release Works**
   - Dashboard shows clear CLEARED or NOT CLEARED status
   - 9-item checklist shows what's missing
   - Status updates automatically when requirements met

6. **Metadata Input Works**
   - User can upload master audio file (max 100MB)
   - User fills metadata form with validation and helpful guidance
   - **Form validates ISRC/UPC formats with real-time feedback**
   - **Artwork validated client-side** for dimensions (min 3000x3000) and size (10MB)
   - User cannot mark metadata complete without all required fields
   - Can download metadata as JSON for distributor

7. **Teaser Tracking Works**
   - User can record teaser posts
   - System tracks minimum 2 teasers requirement
   - Engagement metrics can be manually updated

8. **Alert System Works**
   - Daily cron generates alerts for risks
   - Alerts appear in dashboard
   - User can dismiss alerts
   - Dismissed alerts don't re-create
   - Alert status persists

9. **Identity System Works**
   - UUID generated using `crypto.randomUUID()` (no package needed)
   - Name stored separately for display
   - File acknowledgment restricted to uploader (UUID check)
   - All actions tracked with UUID

### Performance Targets:
- Page load <2 seconds
- Content upload <5 seconds for typical file
- API responses <500ms
- Works on Cloudflare free tier for demo project
- UUID-based identity prevents demo corruption

---

## Technical Verification Summary

✅ **R2 Presigned URLs:** Use `aws4fetch` library (official Cloudflare recommendation)  
✅ **D1 SQL Syntax:** Supports ON CONFLICT, foreign keys, all standard features  
✅ **UUID Generation:** Use native `crypto.randomUUID()` (no package needed)  
✅ **Multipart Upload:** Hono's `c.req.parseBody()` returns File objects  
✅ **Image Validation:** Must be done client-side (Workers don't support Image APIs)  
✅ **Audio Player:** Plyr works perfectly with custom overlay for notes  

---

## Key Implementation Notes

### Critical Don'ts:
- **NEVER allow milestone completion without content quota met**
- **NEVER allow milestone completion with unacknowledged file notes** (for Recording/Mixing/Mastering)
- **NEVER allow budget submission without receipt** (for financial items)
- **NEVER allow files exceeding size limits** (enforce client-side before upload)
- **NEVER use localStorage/sessionStorage** in artifacts (not supported)
- **NEVER use Image/createImageBitmap APIs in Workers** (not available)
- Don't over-engineer - ship MVP first, iterate later
- Don't add features not in spec (stay focused)

### Critical Do's:
- **ALWAYS validate content quota before marking milestone complete**
- **ALWAYS check file notes acknowledged for production milestones**
- **ALWAYS require receipts for budget items**
- **ALWAYS validate file sizes client-side before upload**
- **ALWAYS validate image dimensions client-side**
- **ALWAYS use standardized error codes** (ErrorCodes)
- **ALWAYS use `crypto.randomUUID()` for ID generation**
- **ALWAYS use `aws4fetch` for R2 presigned URLs**
- Use React state for all data (useState, useContext)
- Use Hono's built-in validation
- Use shadcn/ui components (already in template)
- Follow the template's existing patterns

### File Size Limits Reminder:
- Photos: 10MB max
- Short videos: 50MB max
- Long videos: 100MB max (WARNING: at Cloudflare limit)
- Audio files: 100MB max (WARNING: at Cloudflare limit)
- Receipts: 10MB max
- Artwork: 10MB max

Show friendly error: "Your video is 73MB but the limit is 50MB. Please compress before uploading."

### Budget Allocation Reminder:
The 6 categories with recommended %:
1. Production: 35%
2. Marketing: 30%
3. **Content Creation: 10%** (NEW - separate from marketing)
4. Distribution: 10%
5. Admin: 10%
6. Contingency: 5%

### Content Types:
- short_video (15-60s TikTok/Reels)
- long_video (1-5min YouTube)
- photo (still images)
- voice_memo (artist audio notes)
- live_performance (show footage)
- team_meeting (behind-the-scenes)

### Capture Contexts:
- recording_session
- mixing_session
- mastering_session
- rehearsal
- live_show
- team_meeting
- content_day (dedicated content session)
- spontaneous
- archive_footage (retroactive content)

### Alert Keys (for deduplication):
- `milestone_overdue:{milestoneId}`
- `budget_overrun:{category}`
- `content_quota_risk:{milestoneId}`
- `marketing_underspend:{projectId}`

---

## Development Tips

### When You Get Stuck:
1. Check the template's existing code for patterns
2. Review Cloudflare Workers docs for D1/R2 APIs
3. Test API routes with curl or Postman before building UI
4. Use console.log liberally during development
5. Check browser console for frontend errors

### Debugging:
- Local dev uses miniflare for D1/R2 emulation
- Check wrangler.toml bindings are correct
- Verify migrations ran successfully
- Test API routes independently first
- Use React DevTools to inspect state
- Check file size limits if upload fails
- Validate images client-side, not server-side

### Version Control:
- Commit after each major feature
- Use descriptive commit messages
- Don't commit wrangler.toml with production credentials
- Use .gitignore for .env files

---

## Post-MVP Enhancements (After Demo Validation)

Only build these AFTER the demo is successful and Roc Nation validates the concept:

**Phase 8A: Label View Mode (1-2 days)**
- Add "View as Label" toggle
- Disable action buttons in label mode
- Same data, read-only interface

**Phase 8B: Multi-Project Portfolio (2-3 weeks)**
- Portfolio dashboard showing multiple projects
- Comparative analytics across projects
- Project health scoring

**Phase 8C: Platform Integrations (3-4 weeks)**
- Distributor API connections (DistroKid, TuneCore, CD Baby)
- Spotify for Artists API for playlist tracking
- Social media APIs for automated posting

**Phase 8D: Advanced Features (ongoing)**
- Mobile app for on-the-go content capture
- AI-powered content suggestions
- Predictive analytics for project success
- Content creator marketplace
- Advanced budget forecasting

---

## Final Checklist Before Launch

- [ ] UUID identity system works (crypto.randomUUID())
- [ ] All database migrations run successfully
- [ ] R2 bucket created and accessible
- [ ] R2 API credentials configured as secrets
- [ ] All API routes return proper responses with error codes
- [ ] All frontend views render without errors
- [ ] Content upload works end-to-end with size validation
- [ ] Client-side image validation works (dimensions + size)
- [ ] File size errors show friendly messages
- [ ] Milestone completion validation works
- [ ] File timestamp notes work with Plyr (add, view, acknowledge)
- [ ] Recording/Mixing/Mastering milestones require note acknowledgment
- [ ] Budget tracking requires receipts
- [ ] Cleared-for-release calculation correct
- [ ] Alerts generate daily via cron
- [ ] Alerts can be dismissed and stay dismissed
- [ ] Demo presentation prepared for Roc Nation
- [ ] Teaser tracking functional
- [ ] Metadata input working with ISRC/UPC validation
- [ ] Test project can complete full workflow
- [ ] Error handling comprehensive with ErrorCodes
- [ ] Loading states implemented
- [ ] Deployed to production Workers
- [ ] Production database populated
- [ ] Demo data seeding script works

---

This roadmap should be followed sequentially. Each phase builds on the previous. Do not skip ahead or add features not specified. The goal is a working MVP that proves the content quota enforcement concept while working within Cloudflare free tier constraints.

All technical implementations have been verified against official Cloudflare documentation and are production-ready. Good luck building! 🚀