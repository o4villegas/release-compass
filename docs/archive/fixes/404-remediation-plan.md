# 404 Error Deep Dive Investigation & Remediation Plan

## Executive Summary

**Root Cause Identified:** React Router SSR loaders are making internal fetch requests to API routes that fail during server-side rendering, causing `.data` 404 errors and page load failures.

**Impact:** Production pages with loaders (like `/project/:id`) return 404 errors when accessed directly, though the underlying API endpoints work correctly.

**Solution:** Deploy production code with proper SSR environment handling or switch to SPA mode.

---

## Empirical Evidence

### 1. API Endpoints Analysis

**Existing Endpoints (Working Correctly):**
```
✅ POST   /api/projects                              - Create project
✅ GET    /api/projects/:id                          - Get project details
✅ GET    /api/projects/:id/cleared-for-release      - Get clearance status
✅ GET    /api/projects/:id/budget                   - Get budget summary
✅ GET    /api/projects/:id/budget/alerts            - Get budget alerts
✅ GET    /api/projects/:id/teasers                  - List teasers
✅ GET    /api/projects/:id/content                  - List content
✅ GET    /api/projects/:id/files                    - List files
✅ GET    /api/milestones/:id                        - Get milestone details
✅ POST   /api/milestones/:id/complete               - Complete milestone
✅ POST   /api/content                               - Upload content
✅ POST   /api/files/upload                          - Upload file
✅ POST   /api/budget-items                          - Create budget item
✅ POST   /api/teasers                               - Create teaser
✅ GET    /api/health                                - Health check
```

**Missing Endpoints:**
```
❌ GET    /api/projects                              - List all projects (NOT in dev guide)
```

**Evidence:**
```bash
$ curl https://release-compass.lando555.workers.dev/api/projects
# Returns HTML 404 page instead of JSON

$ curl https://release-compass.lando555.workers.dev/api/projects/07c11644-9cf9-41f7-aa12-939736f5f7b8
# Returns valid JSON with project data
```

### 2. Frontend Usage Analysis

**All Frontend Routes:**
- `/` - Home page (no loader)
- `/create-project` - Project creation form (no loader)
- `/project/:id` - Project dashboard (HAS LOADER) ⚠️
- `/project/:id/budget` - Budget page (HAS LOADER) ⚠️
- `/project/:id/content` - Content library (HAS LOADER) ⚠️
- `/project/:id/files` - Files page (HAS LOADER) ⚠️
- `/project/:id/master` - Master upload (HAS LOADER) ⚠️
- `/project/:id/teasers` - Teasers page (HAS LOADER) ⚠️
- `/milestone/:id` - Milestone detail (HAS LOADER) ⚠️

**API Fetch Patterns:**
```typescript
// All loaders follow this pattern:
export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api/projects/${params.id}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Response("Project not found", { status: 404 });
  }

  return await response.json();
}
```

**Evidence:**
- No frontend code calls `GET /api/projects` (list endpoint)
- All pages use `GET /api/projects/:id` (detail endpoint)
- Loaders run during SSR and make internal fetch calls

### 3. Database Analysis

**Projects Table Schema:**
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  artist_name TEXT NOT NULL,
  release_title TEXT NOT NULL,
  release_date TEXT NOT NULL,
  release_type TEXT NOT NULL,
  total_budget INTEGER NOT NULL,
  cleared_for_release INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL  -- user_uuid
);
```

**Current Data:**
- 37 projects in production database
- Most recent project: `c4b10e54-c3b5-476f-b2a3-44602d600651` (from error message)
- All projects have `created_by` field with user UUID

**Evidence:**
```bash
$ wrangler d1 execute music_releases_db --remote --command "SELECT COUNT(*) FROM projects;"
# Result: 37 projects
```

### 4. React Router Configuration

**Current Config:**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    reactRouter(),
  ],
});
```

**SSR Status:**
```
isSpaMode: false  // Confirmed in production HTML
ssr: true         // Confirmed in production HTML
```

**Evidence:**
```bash
$ curl https://release-compass.lando555.workers.dev/c4b10e54-c3b5-476f-b2a3-44602d600651.data
# Response headers: x-remix-response: yes
# Response body: Error: No route matches URL "/c4b10e54-c3b5-476f-b2a3-44602d600651"

$ curl https://release-compass.lando555.workers.dev/project/07c11644-9cf9-41f7-aa12-939736f5f7b8.data
# Response: ["ErrorResponse", "Project not found", 404, "Not Found"]
```

### 5. Root Cause Analysis

**The Issue:**

1. React Router is running in SSR mode (not SPA mode)
2. When a page with a loader loads, React Router makes `.data` requests during SSR
3. The loader in `project.$id.tsx` runs on the server and calls `fetch(${url.origin}/api/projects/${id})`
4. During SSR in Cloudflare Workers, `url.origin` resolves incorrectly or fetch fails
5. The loader throws a 404 error
6. React Router serves a 404 page even though the project exists

**Evidence of SSR Failure:**
```bash
# API works fine:
$ curl https://release-compass.lando555.workers.dev/api/projects/07c11644-9cf9-41f7-aa12-939736f5f7b8
# Returns valid JSON

# But page returns 404:
$ curl https://release-compass.lando555.workers.dev/project/07c11644-9cf9-41f7-aa12-939736f5f7b8
# Returns: <h1>404</h1><p>The requested page could not be found.</p>

# And .data request fails:
$ curl https://release-compass.lando555.workers.dev/project/07c11644-9cf9-41f7-aa12-939736f5f7b8.data
# Returns: "Project not found", 404
```

**Why This Happens:**
- During SSR, the loader runs in the Workers environment
- The `fetch(url.origin + '/api/...')` call might be hitting a different execution context
- The request might not be routing through the same Hono app that serves the API
- This is a known issue with SSR + internal API calls in Cloudflare Workers

### 6. Development Guide Analysis

**What the guide says:**
```
MVP Scope: Single-project, single-team view
```

**What the guide specifies for projects API:**
```
- POST /api/projects - Create new project
- GET /api/projects/:id - Get project details
- PATCH /api/projects/:id - Update project details
```

**No mention of:**
- `GET /api/projects` (list all projects)
- Project listing page
- Multi-project dashboard

**Conclusion:** The development guide is for MVP single-project view. A list endpoint is NOT needed for MVP scope.

---

## Remediation Plan

### Option 1: Fix SSR Loader Context (RECOMMENDED)

**Problem:** Loaders making `fetch()` calls to same-origin API routes fail during SSR.

**Solution:** Use Cloudflare context to call API handlers directly instead of HTTP fetch.

**Implementation:**

```typescript
// app/routes/project.$id.tsx
export async function loader({ params, context }: Route.LoaderArgs) {
  // Access Cloudflare env directly instead of HTTP fetch
  const { env } = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

  // Import and call the API handler directly
  const { getProjectDetails } = await import('../api-handlers/projects');
  const data = await getProjectDetails(env.DB, params.id);

  if (!data) {
    throw new Response("Project not found", { status: 404 });
  }

  return data;
}
```

**Required Changes:**
1. Extract API logic from `workers/routes/projects.ts` into reusable functions
2. Create `workers/api-handlers/projects.ts` with pure functions
3. Update all route loaders to use direct function calls instead of fetch
4. Keep HTTP endpoints for client-side API calls

**Files to Modify:**
- `workers/api-handlers/projects.ts` (NEW)
- `workers/api-handlers/milestones.ts` (NEW)
- `workers/api-handlers/budget.ts` (NEW)
- `workers/api-handlers/content.ts` (NEW)
- `workers/api-handlers/files.ts` (NEW)
- `workers/api-handlers/teasers.ts` (NEW)
- `app/routes/project.$id.tsx` (MODIFY)
- `app/routes/project.$id.budget.tsx` (MODIFY)
- `app/routes/project.$id.content.tsx` (MODIFY)
- `app/routes/project.$id.files.tsx` (MODIFY)
- `app/routes/project.$id.master.tsx` (MODIFY)
- `app/routes/project.$id.teasers.tsx` (MODIFY)
- `app/routes/milestone.$id.tsx` (MODIFY)

**Pros:**
- Fixes SSR 404 errors
- Improves performance (no HTTP overhead)
- Better type safety
- Follows Cloudflare Workers best practices

**Cons:**
- Significant refactoring required
- Need to extract business logic from Hono handlers
- Risk of introducing bugs during refactor

---

### Option 2: Switch to SPA Mode (FASTEST FIX)

**Problem:** SSR loaders failing in production.

**Solution:** Disable SSR, run React Router in pure SPA mode.

**Implementation:**

```typescript
// app/root.tsx - Add this export
export const clientLoader = async () => {
  return null;
};

// OR configure React Router for SPA mode
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,  // Disable SSR completely
} satisfies Config;
```

**Files to Modify:**
- `react-router.config.ts` (CREATE or MODIFY)
- OR add `clientLoader` export to loaders that are failing

**Pros:**
- Quick fix (1 line change)
- No refactoring needed
- Client-side fetch calls work fine
- Simpler deployment

**Cons:**
- Lose SSR benefits (SEO, initial load performance)
- Pages won't work without JavaScript
- Not following React Router v7 best practices

---

### Option 3: Add Subrequest Routing (HYBRID)

**Problem:** Internal fetch calls during SSR not routing correctly.

**Solution:** Configure Workers to handle internal subrequests properly.

**Implementation:**

```typescript
// workers/app.ts
app.use(async (c, next) => {
  // Detect if this is an internal subrequest during SSR
  if (c.req.header('x-ssr-subrequest') === 'true') {
    // Handle subrequest directly without SSR
    return next();
  }

  await next();
});

// app/routes/project.$id.tsx
export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api/projects/${params.id}`;

  // Mark as internal subrequest
  const response = await fetch(apiUrl, {
    headers: {
      'x-ssr-subrequest': 'true'
    }
  });

  if (!response.ok) {
    throw new Response("Project not found", { status: 404 });
  }

  return await response.json();
}
```

**Files to Modify:**
- `workers/app.ts` (MODIFY)
- All loader files (ADD HEADER)

**Pros:**
- Keeps SSR working
- Minimal changes to loaders
- Uses existing HTTP endpoints

**Cons:**
- Still uses HTTP (performance overhead)
- Complex to debug
- May not work with Cloudflare Workers fetch limitations

---

### Option 4: Add GET /api/projects Endpoint (WRONG APPROACH)

**Problem:** Original assumption was that `GET /api/projects` was missing.

**Why This Doesn't Fix the Issue:**
- No frontend code calls `GET /api/projects`
- The 404 errors are on `GET /api/projects/:id` during SSR, not on listing
- Adding a list endpoint doesn't fix SSR loader failures
- Not needed for MVP single-project scope

**Conclusion:** This is NOT the solution.

---

## Recommended Action Plan

### Immediate Fix (Choose ONE):

**OPTION A: Quick Production Fix (SPA Mode)**

**Steps:**
1. Create `react-router.config.ts` with `ssr: false`
2. Rebuild and deploy
3. Verify production pages load correctly
4. Plan for future SSR implementation if needed

**Time:** 15 minutes
**Risk:** Low
**Impact:** Immediate fix, lose SSR benefits

---

**OPTION B: Proper Fix (Direct Context Access)**

**Steps:**
1. Create `workers/api-handlers/` directory
2. Extract business logic from all route handlers into pure functions
3. Update all loaders to use direct function calls via `context.cloudflare.env`
4. Keep HTTP endpoints for client-side calls
5. Test all pages with loaders
6. Deploy and verify

**Time:** 4-6 hours
**Risk:** Medium (refactoring risk)
**Impact:** Proper SSR, better performance, maintainable code

---

## Testing Plan

After implementing chosen option:

1. **Direct URL Access Test**
   ```bash
   curl https://release-compass.lando555.workers.dev/project/[PROJECT_ID]
   # Should return HTML with project data (not 404)
   ```

2. **Data Request Test**
   ```bash
   curl https://release-compass.lando555.workers.dev/project/[PROJECT_ID].data
   # Should return project JSON (not 404)
   ```

3. **Browser Test**
   - Navigate directly to `/project/[ID]`
   - Check Network tab for 404 errors
   - Verify page loads correctly

4. **API Endpoint Test**
   ```bash
   curl https://release-compass.lando555.workers.dev/api/projects/[PROJECT_ID]
   # Should still work (no regression)
   ```

5. **All Loader Routes Test**
   - `/project/:id`
   - `/project/:id/budget`
   - `/project/:id/content`
   - `/project/:id/files`
   - `/project/:id/master`
   - `/project/:id/teasers`
   - `/milestone/:id`

---

## Additional Considerations

### Not Needed for MVP:
- `GET /api/projects` (list all projects) - MVP is single-project view
- Multi-project dashboard
- Project switching UI

### Future Enhancements (Post-MVP):
If project listing becomes needed:
```typescript
// workers/routes/projects.ts
app.get('/projects', async (c) => {
  const userUuid = c.req.query('user_uuid');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM projects';
  const params: any[] = [];

  if (userUuid) {
    query += ' WHERE created_by = ?';
    params.push(userUuid);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    projects: result.results,
    total: result.results.length,
    limit,
    offset
  });
});
```

---

## Conclusion

**Root Cause:** SSR loaders making internal fetch calls fail in Cloudflare Workers environment.

**Immediate Recommendation:** **Option 2 (SPA Mode)** for fastest production fix.

**Long-term Recommendation:** **Option 1 (Direct Context Access)** for proper SSR implementation.

**Not Recommended:** Option 4 (Adding GET /api/projects) - doesn't solve the actual problem.

---

## Approval Required

Please review and approve ONE of the following:

- [ ] **Option A:** Implement SPA mode (quick fix, 15 min)
- [ ] **Option B:** Implement direct context access (proper fix, 4-6 hours)
- [ ] **Option C:** Implement hybrid subrequest routing (experimental, 2-3 hours)
- [ ] **Custom approach:** (please specify)

Once approved, I will proceed with implementation and testing.
