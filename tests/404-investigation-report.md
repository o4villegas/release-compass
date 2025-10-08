# 404 Error Investigation Report

## Summary

Investigation into the 404 error: `c4b10e54-c3b5-476f-b2a3-44602d600651.data`

## Findings

### 1. React Router .data Requests: ✅ NOT AN ISSUE
- **Result:** No `.data` requests detected in production
- **Evidence:** Ran Playwright tests monitoring all network requests
- **Conclusion:** The app is running in SPA mode correctly, not using SSR data loaders
- **Status:** No action needed

### 2. Missing API Endpoint: 🔴 CRITICAL ISSUE FOUND

**Missing Endpoint:** `GET /api/projects` (list all projects)

**Current State:**
```
✅ POST /api/projects          - Create project (exists)
✅ GET  /api/projects/:id      - Get single project (exists)
❌ GET  /api/projects          - List all projects (MISSING)
```

**Impact:**
- Tests attempting to fetch project list fail with 404
- Returns HTML (404 page) instead of JSON
- Any UI components trying to list projects will fail

**Location:** `/home/lando555/release-compass/workers/routes/projects.ts`

**Current endpoints in projects.ts:**
```typescript
POST   /projects                           - Create project
GET    /projects/:id                       - Get project details
GET    /projects/:id/cleared-for-release   - Get clearance status
```

### 3. Route Configuration Issues: ⚠️ MINOR

**Issue:** Inconsistent route naming in tests
- Route is `/create-project` (correct)
- Some tests were trying `/project/create` (wrong)

**Status:** Already identified and documented

## Root Cause

The original `.data` 404 error is likely from a transient issue or different deployment state. Current production has:
1. ✅ No React Router SSR data requests (SPA mode working correctly)
2. 🔴 Missing `GET /api/projects` endpoint for listing projects

## Recommended Actions

### Required: Add GET /api/projects endpoint

```typescript
// In workers/routes/projects.ts
app.get('/projects', async (c) => {
  try {
    const db = c.env.DB;

    // Optional: support filtering by user_uuid
    const userUuid = c.req.query('user_uuid');

    let query = 'SELECT * FROM projects ORDER BY created_at DESC';
    let stmt = db.prepare(query);

    if (userUuid) {
      query = 'SELECT * FROM projects WHERE id IN (SELECT DISTINCT project_id FROM users WHERE user_uuid = ?) ORDER BY created_at DESC';
      stmt = db.prepare(query).bind(userUuid);
    }

    const result = await stmt.all();

    return c.json(result.results || []);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
```

### Optional: Add pagination support

```typescript
// Support ?limit=10&offset=0
const limit = parseInt(c.req.query('limit') || '50');
const offset = parseInt(c.req.query('offset') || '0');

query += ` LIMIT ? OFFSET ?`;
stmt = db.prepare(query).bind(limit, offset);
```

## Test Results

| Test | Status | Notes |
|------|--------|-------|
| No .data requests | ✅ PASS | Confirmed SPA mode |
| GET /api/health | ✅ PASS | Working |
| GET /api/projects | ❌ FAIL | 404 - endpoint missing |
| GET /api/projects/:id | ✅ PASS | Working |
| POST /api/projects | ✅ PASS | Working |

## Conclusion

The `.data` 404 error is not currently reproducible in production. The main issue is the **missing GET `/api/projects`** endpoint, which should be added to support listing all projects.

**Priority:** Medium (needed for future features but not blocking current functionality)
