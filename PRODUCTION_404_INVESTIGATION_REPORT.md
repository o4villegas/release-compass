# Production 404 Error - Investigation Report

**Date**: 2025-10-12 18:32
**Error**: `GET https://release-compass.lando555.workers.dev/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d 404 (Not Found)`
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## Executive Summary

The 404 error occurs because **the official demo project does not exist in the production database**. The project exists locally but was never seeded to production. The home page links to a project ID that doesn't exist in the remote D1 database.

**Root Cause**: Demo project data only exists in local development database, not in production.

**Impact**: CRITICAL - Home page "View Demo Project" button is broken in production.

---

## Empirical Evidence

### 1. Local Database State (Working)

```bash
wrangler d1 execute music_releases_db --local --command \
  "SELECT id, artist_name, release_title FROM projects WHERE id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d'"
```

**Result**:
```json
{
  "id": "b434c7af-5501-4ef7-a640-9cb19b2fe28d",
  "artist_name": "Implementation Test",
  "release_title": "Test Album"
}
```

✅ **Demo project EXISTS in local database**

---

### 2. Production Database State (Missing)

```bash
wrangler d1 execute music_releases_db --remote --command \
  "SELECT id, artist_name, release_title FROM projects WHERE id = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d'"
```

**Result**:
```json
{
  "results": []
}
```

❌ **Demo project DOES NOT EXIST in production database**

---

### 3. Production Database Contents

**Existing Projects in Production** (most recent 5):
```
1. 269511c6-5213-46ef-b890-4e0d2e51343c - E2E Test Artist - Interactive UI Test Album
2. c7cccaba-430a-4250-8d77-467f1daac4e6 - Upload Test 1760049221013
3. 399030c2-9c62-4b41-9b85-4e19cef116a9 - Milestone Test 1760049220608
4. 8ce4fb3d-a3da-4df4-8dee-b4d7ae24718e - Content Test 1760049220309
5. d195a387-ed70-46dc-a2c5-731fe0d5ee4d - Test Artist 1760049220099
```

**Observation**: All projects are E2E test artifacts from Playwright runs. No demo project exists.

---

### 4. Migration Status

**Pending Migrations in Production**:
```
┌────────────────────────────────────┐
│ Name                               │
├────────────────────────────────────┤
│ 0009_add_content_schedule.sql      │
├────────────────────────────────────┤
│ 0010_remove_stale_demo_project.sql │
└────────────────────────────────────┘
```

**Analysis**:
- Migration 0009: Adds content_schedule table (safe to apply)
- Migration 0010: Deletes stale demo project `b199c34c` (which doesn't exist in production anyway)

**Table Status**:
- ✅ All tables exist in production (projects, milestones, content_items, etc.)
- ❌ `content_schedule` table missing (migration 0009 not applied)

---

### 5. Seed Script Analysis

**File**: `scripts/enhance-demo-project.sql`

**Purpose**: Populates demo data for project `b434c7af-5501-4ef7-a640-9cb19b2fe28d`

**Type**: Enhancement/UPDATE script (not CREATE script)

**Key Finding**: This script UPDATES existing content and milestones. It assumes:
1. Project `b434c7af` already exists
2. Milestones already exist with specific IDs
3. Content items exist with specific IDs

**Problem**: This is not a standalone seed script - it enhances an existing project created manually or by another process.

---

### 6. Home Page Link

**File**: `app/routes/home.tsx:98`

```tsx
{/* Official demo project ID: b434c7af-5501-4ef7-a640-9cb19b2fe28d */}
{/* This project is seeded by scripts/enhance-demo-project.sql */}
<Link to="/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d">
  <Button variant="outline" size="sm" className="w-full">
    View Demo Project
  </Button>
</Link>
```

**Analysis**: Home page links to project that doesn't exist in production.

---

## Root Cause Analysis

### The Sequence of Events

1. **Local Development**:
   - Demo project created manually via UI in local development
   - Project assigned ID: `b434c7af-5501-4ef7-a640-9cb19b2fe28d`
   - Enhancement script created to populate demo data (content, milestones, files)
   - Home page updated to link to this project

2. **Production Deployment**:
   - Code deployed via GitHub (home page with demo project link)
   - Migrations 0009 and 0010 NOT YET applied to production
   - ❌ Demo project NEVER created in production database
   - ❌ Enhancement script NEVER run in production

3. **User Click**:
   - User clicks "View Demo Project" button
   - Browser requests `/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d`
   - React Router loader calls `getProjectDetails()`
   - Query returns no results (project doesn't exist)
   - Loader throws 404 error

---

## Why This Happened

### Missing Step: Production Data Seeding

**What Was Done**:
- ✅ Code deployed to production
- ✅ Migrations created
- ❌ Migrations NOT applied to production
- ❌ Demo project NOT created in production

**What Should Have Been Done**:
1. Apply migration 0009 (content_schedule table)
2. Apply migration 0010 (delete stale project - no-op since it doesn't exist)
3. **Create base demo project** in production
4. **Run enhancement script** to populate demo data

---

## Impact Assessment

### Severity: CRITICAL

**User Impact**:
- ❌ "View Demo Project" button completely broken
- ❌ Users cannot see demo functionality
- ❌ Home page shows broken feature

**Workaround**: None - project simply doesn't exist

**Affected Users**: All production users

---

## Comparison: Local vs Production

| Aspect | Local Development | Production |
|--------|------------------|------------|
| Demo Project Exists | ✅ Yes (`b434c7af`) | ❌ No |
| Stale Project Exists | ❌ No (deleted by migration) | ❌ No (never existed) |
| Migrations Applied | ✅ Through 0010 | ❌ Pending 0009, 0010 |
| content_schedule Table | ✅ Exists | ❌ Missing |
| Demo Data | ✅ Full demo data | ❌ None |

---

## The Missing Piece: Base Demo Project Creation

**Issue**: The `enhance-demo-project.sql` script is NOT a complete seed script. It only UPDATES existing records.

**What's Missing**: A script to CREATE the base demo project with:
1. Project record (id, artist_name, release_title, etc.)
2. Milestone records (11 milestones with specific IDs)
3. Base content items (referenced by enhancement script)
4. Milestone content requirements

**Where Did This Come From?**: The base project was likely created:
1. Manually via the UI in local development, OR
2. By an E2E test that wasn't persisted, OR
3. By a seed script that was never committed

---

## Solution Options

### Option A: Create Complete Seed Script (RECOMMENDED)
**Time**: 30-45 minutes
**Approach**: Create a standalone SQL script that:
1. Inserts base project with all required fields
2. Inserts all 11 milestones with content requirements
3. Inserts base content items
4. Runs the enhancement script to add detailed demo data

**Pros**:
- Complete, reproducible solution
- Works for fresh production deployments
- Can be version controlled
- Can be rerun if database is reset

**Cons**:
- Requires extracting project structure from local DB
- More work upfront

---

### Option B: Export from Local, Import to Production
**Time**: 10-15 minutes
**Approach**:
1. Export demo project data from local DB (SQLite dump)
2. Import to production DB via wrangler

**Pros**:
- Quick fix
- Gets exact local data

**Cons**:
- Not reproducible
- Harder to track in version control
- Risky if local data has test artifacts

---

### Option C: Create Demo Project via Production UI
**Time**: 20-30 minutes
**Approach**:
1. Navigate to production site
2. Click "Create New Project"
3. Manually create project with specific ID (requires DB direct insert)
4. Add milestones and content via UI
5. Run enhancement script

**Pros**:
- Uses production UI (real-world test)

**Cons**:
- Cannot control project ID (UI generates random UUID)
- Very time-consuming
- Not reproducible
- Home page would need to be updated with new ID

---

## Recommended Solution: Option A

**Create Complete Seed Script** (`scripts/seed-demo-project.sql`)

### Step 1: Create Base Project
```sql
INSERT INTO projects (id, artist_name, release_title, release_type, release_date, total_budget, created_at, created_by_uuid)
VALUES (
  'b434c7af-5501-4ef7-a640-9cb19b2fe28d',
  'Implementation Test',
  'Test Album',
  'Album',
  '2026-08-15',
  50000,
  '2026-02-15T10:00:00Z',
  'demo-seed-script'
);
```

### Step 2: Create Milestones
```sql
INSERT INTO milestones (id, project_id, name, description, due_date, status, ...) VALUES
  ('d3efdf2d-d816-4e70-b605-63e9e4079802', 'b434c7af...', 'Recording Complete', ..., '2026-03-17', 'pending', ...),
  -- ... 10 more milestones
```

### Step 3: Create Milestone Content Requirements
```sql
INSERT INTO milestone_content_requirements (milestone_id, content_type, minimum_required) VALUES
  ('d3efdf2d-d816-4e70-b605-63e9e4079802', 'short_video', 3),
  ('d3efdf2d-d816-4e70-b605-63e9e4079802', 'photo', 10),
  -- ... more requirements
```

### Step 4: Create Base Content Items
```sql
INSERT INTO content_items (id, project_id, content_type, ...) VALUES
  ('content-1', 'b434c7af...', 'short_video', ...),
  -- ... base content referenced by enhancement script
```

### Step 5: Run Enhancement Script
```bash
wrangler d1 execute music_releases_db --remote --file=scripts/enhance-demo-project.sql
```

---

## Validated Assumptions

✅ **Assumption 1**: Demo project exists in local DB
**Validation**: Query returned project data

✅ **Assumption 2**: Demo project missing in production
**Validation**: Query returned empty results

✅ **Assumption 3**: Migrations not applied to production
**Validation**: `wrangler d1 migrations list --remote` shows 2 pending

✅ **Assumption 4**: Enhancement script requires existing project
**Validation**: Script uses UPDATE and references specific IDs

✅ **Assumption 5**: No base creation script exists
**Validation**: Checked scripts/ directory, only enhancement script exists

---

## Next Steps - Awaiting Approval

**Recommendation**: Proceed with **Option A** (Complete Seed Script)

**Tasks**:
1. Extract base project structure from local database
2. Create `scripts/seed-demo-project.sql` with base project + milestones
3. Test script on fresh local database
4. Apply to production in sequence:
   - Run migration 0009 (content_schedule table)
   - Run migration 0010 (delete stale project - no-op)
   - Run seed-demo-project.sql (create base structure)
   - Run enhance-demo-project.sql (populate demo data)

**Estimated Time**: 45 minutes
**Risk**: Low (script can be tested locally first)
**Impact**: Fixes production demo project link completely

---

## Questions for User

1. ✅ Approve Option A (Complete Seed Script)?
2. ⏸️ Or prefer Option B (Export/Import from local)?
3. ⏸️ Or prefer Option C (Manual creation via UI)?

**Awaiting approval before proceeding.**
