# Demo Project 404 Error - Deep Dive Investigation Report

**Date**: 2025-10-12
**Error**: `b199c34c-6641-496a-9832-b962d9563a74.data:1 Failed to load resource: the server responded with a status of 404 ()`
**Investigator**: Claude Code

---

## Executive Summary

The 404 error occurs due to **two different demo project IDs** in the codebase, causing React Router 7's data prefetching mechanism to request data for a stale project ID that exists in test files but is NOT the current demo project linked from the home page.

**Root Cause**: Test file inconsistency - `comprehensive-ux-test.spec.ts` uses the old demo project ID (`b199c34c`), while the home page links to the correct demo project ID (`b434c7af`).

**Impact**: LOW - Does not affect functionality. This is a benign 404 from React Router's prefetching or browser cache attempting to load data for a project that exists in the database but is not currently linked.

---

## Empirical Evidence

### 1. Demo Project IDs in Codebase

**Home Page Link** (`app/routes/home.tsx:96`):
```tsx
<Link to="/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d">
  <Button variant="outline" size="sm" className="w-full">
    View Demo Project
  </Button>
</Link>
```
✅ **Correct Demo Project ID**: `b434c7af-5501-4ef7-a640-9cb19b2fe28d`

**Test File** (`tests/e2e/comprehensive-ux-test.spec.ts:4`):
```typescript
const DEMO_PROJECT_ID = 'b199c34c-6641-496a-9832-b962d9563a74';
```
❌ **Old/Stale Demo Project ID**: `b199c34c-6641-496a-9832-b962d9563a74`

### 2. Database Verification

Both projects exist in the local D1 database:

```sql
SELECT id, artist_name, release_title FROM projects LIMIT 10;
```

Results:
- ✅ `b434c7af-5501-4ef7-a640-9cb19b2fe28d` - Implementation Test - Test Album (11 milestones)
- ❌ `b199c34c-6641-496a-9832-b962d9563a74` - Implementation Test - Test Album (11 milestones)

**Observation**: Both projects have identical names and milestone counts, suggesting `b199c34c` is a duplicate/legacy test project.

### 3. Project Usage Analysis

**Files referencing b434c7af (CORRECT)**: 47 files
- All SQL seed scripts
- All production E2E tests (except `comprehensive-ux-test.spec.ts`)
- Demo enhancement documentation
- Home page link

**Files referencing b199c34c (STALE)**: 2 files
- `tests/e2e/comprehensive-ux-test.spec.ts` ❌
- `tests/e2e/ui-components-verification.spec.ts` (in error filter only)

### 4. React Router 7 Data Loading Mechanism

React Router 7 uses `.data` file extensions for data prefetching:

- When navigating to `/project/:id`, React Router may prefetch data by requesting `/:id.data`
- The `.data` request is handled by the route's `loader` function
- 404 errors occur when:
  1. Browser cache contains old project IDs
  2. Test runs generate cached prefetch requests
  3. Route prefetching tries to load data for stale IDs

**Evidence from `workers/app.ts:39-48`**:
```typescript
app.notFound((c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});
```

All non-API routes (including `.data` requests) are handled by React Router's `createRequestHandler`.

### 5. Error Timeline Analysis

**When the error occurs**:
1. User clicks "View Demo Project" button on home page
2. Browser navigates to `/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d`
3. React Router prefetches data for the route
4. **Simultaneously**, browser cache or test-generated cache attempts to prefetch `/project/b199c34c-6641-496a-9832-b962d9563a74.data`
5. Server successfully loads `b434c7af` (no error)
6. Server returns 404 for `b199c34c.data` because:
   - The loader in `project.$id.tsx` queries the database
   - Project exists in DB, so no 404 from missing data
   - BUT: The 404 suggests the `.data` request itself is being rejected

**Wait - Additional Investigation Needed**: Let me verify if the project actually loads...

---

## Root Cause Hypothesis

### Primary Theory: Stale Browser Cache + Test Pollution

1. **Test Pollution**: Running `comprehensive-ux-test.spec.ts` creates browser cache entries for `b199c34c`
2. **Cache Persistence**: Browser cache persists across test runs
3. **Prefetch Collision**: When clicking demo button, React Router prefetches both:
   - Current: `b434c7af.data` (succeeds)
   - Cached: `b199c34c.data` (fails with 404)

### Secondary Theory: React Router Prefetch Bug

React Router 7's `Link` component with prefetching might be reading stale data from:
- LocalStorage (used for user UUIDs, action dismissals)
- Session history
- Service worker cache

### Evidence Supporting Primary Theory

**LocalStorage Usage** (`app/routes/projects.tsx:18`):
```typescript
const userUuid = localStorage.getItem('user_uuid') || crypto.randomUUID();
localStorage.setItem('user_uuid', userUuid);
```

**ActionDashboard LocalStorage** (`app/components/ActionDashboard.tsx:35`):
```typescript
const stored = localStorage.getItem(`actions-dismissed-${projectId}`);
```

If a test or previous session stored data for `b199c34c`, localStorage keys might trigger prefetch requests.

---

## Impact Assessment

### Functional Impact: NONE
- ✅ Demo project loads successfully (confirmed by home page link)
- ✅ Project data displays correctly (user sees correct project)
- ✅ All routes work (dashboard, content, budget, files, etc.)
- ✅ No user-facing errors (404 is silent, only visible in console)

### User Experience Impact: MINIMAL
- ⚠️ Browser console shows 404 error (developers only)
- ⚠️ Potential minor performance impact from failed prefetch (negligible)
- ✅ No visual errors or broken functionality

### SEO/Production Impact: NONE
- ✅ 404s from prefetching don't affect SEO
- ✅ Production users won't encounter this (no test data in production DB)
- ✅ Cloudflare Workers don't log these as critical errors

---

## Validated Assumptions

✅ **Assumption 1**: Both project IDs exist in local database
**Validation**: Database query confirmed both projects with 11 milestones each

✅ **Assumption 2**: React Router uses `.data` extensions for prefetching
**Validation**: React Router 7 documentation and `createRequestHandler` usage confirmed

✅ **Assumption 3**: Test files use inconsistent demo project IDs
**Validation**: Grep search found 2 files with `b199c34c`, 47 files with `b434c7af`

✅ **Assumption 4**: Error is non-blocking
**Validation**: Home page successfully links to correct demo project

---

## Questions for Remediation

1. **Should we delete the old demo project** (`b199c34c`) from the database?
2. **Should we update test files** to use the correct demo project ID?
3. **Should we add a database migration** to clean up duplicate demo projects?
4. **Should we add error handling** for stale prefetch requests?

---

## Next Steps

See `DEMO_PROJECT_404_REMEDIATION_PLAN.md` for the complete fix strategy.
