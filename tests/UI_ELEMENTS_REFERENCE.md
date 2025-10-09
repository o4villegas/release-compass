# UI Elements Reference for E2E Testing

## Complete UI Element Inventory - Empirical Evidence

### 1. CREATE PROJECT FORM (`/create-project`)

**Page Identifier:**
- H1: "Release Compass"
- CardTitle: "New Release Project"

**Form Input Elements:**
```typescript
// Text Inputs (use ID selectors)
'#artist_name'      - Artist Name field
'#release_title'    - Release Title field
'#release_date'     - Release Date field (type="date")
'#total_budget'     - Total Budget field (type="number")

// Radix UI Select (NOT native select)
// Trigger: button[role="combobox"] (opens dropdown)
// Options: role="option" with text content
// Options: "Single", "EP", "Album"

// Submit Button
button[type="submit"] with text "Create Project" or "Creating Project..."
```

**How to Interact with Select:**
```typescript
// Click the SelectTrigger to open dropdown
await page.click('button[role="combobox"]');

// Wait for dropdown to appear
await page.waitForTimeout(500);

// Click the option with specific text
await page.click('[role="option"]:has-text("Album")');
```

**Navigation After Submit:**
- Redirects to `/project/{projectId}` on success
- Can extract projectId from URL: `page.url().split('/project/')[1]`

---

### 2. PROJECT DASHBOARD (`/project/{id}`)

**Page Identifiers:**
- H1: Contains `{project.release_title}`
- BackButton with text: "Back to Home"

**Key UI Components:**

**Navigation Buttons:**
```typescript
// All use <Link> components, role="link"
'Master Upload'
'Production Files'
'Budget'
'Teasers'
'Content Library'
```

**4-Column Grid Cards (`.grid.md\\:grid-cols-4`):**
1. "Project Progress" - CardTitle
2. "Budget" - CardTitle
3. "Cleared for Release" - CardTitle
4. "Content Quotas" - CardTitle (ContentQuotaWidget)

**Timeline Insights Panel:**
```typescript
'Critical Path' - text
'Time to Release' - text
'Next Deadline' - text
'Overall Progress' - text
```

**Milestone Timeline:**
```typescript
'Milestone Timeline' - heading for MilestoneGantt
```

**Milestone Links:**
```typescript
// Milestone links use href pattern
a[href*="/milestone/"]  - multiple links to milestone pages
```

---

### 3. MILESTONE DETAIL PAGE (`/milestone/{id}`)

**Page Identifiers:**
- CardTitle: "Quota Status"
- CardTitle: "Content Requirements"

**Complete Button:**
```typescript
// Button text changes based on state:
button:has-text("Mark as Complete")  // When ready
button:has-text("Completing...")      // When processing

// Button is disabled when:
// - quotaStatus.quota_met is false
// - completing is true
```

**Modal Triggers:**
When clicking "Mark as Complete" without meeting requirements:
- API returns error codes: 'QUOTA_NOT_MET', 'NOTES_NOT_ACKNOWLEDGED', 'TEASER_REQUIREMENT_NOT_MET'
- These trigger state changes that open modals

**Modals (Dialog components from Radix UI):**
```typescript
// QuotaNotMetModal
DialogTitle: "Content Quota Not Met"
Button: "Upload Content" (link to /project/{id}/content)
Button: "Cancel"

// NotesNotAcknowledgedModal
DialogTitle: "Master File Notes Require Acknowledgment"
Button: "Review Notes" (link to /project/{id}/master)
Button: "Cancel"

// TeaserRequirementModal
DialogTitle: "Teaser Requirement Not Met"
Button: "Create Teasers" (link to /project/{id}/teasers)
Button: "Cancel"
```

---

### 4. CONTENT LIBRARY PAGE (`/project/{id}/content`)

**Page Identifiers:**
- H1 or heading: "Content Library"
- Tabs component present

**Tab Structure:**
```typescript
// TabsTrigger elements
'Upload Content'    - tab 1
'Content Library'   - tab 2
'By Milestone'      - tab 3
```

**EmptyState (when no content):**
```typescript
// Appears in "Content Library" tab when contentItems.length === 0
title: "No Content Yet"
icon: "📸" emoji
description: "Start building your content library..."
action button: "Go to Upload Tab"
```

---

### 5. MASTER UPLOAD PAGE (`/project/{id}/master`)

**Page Identifiers:**
- H1: "Master & Artwork Upload"

**3-Step Process (3-column grid `lg:grid-cols-3`):**

**Step 1 - Master Audio:**
```typescript
CardTitle: contains "Master Audio"
Input: id="master-file" type="file"
Button: "Upload Master" or "✓ Master Uploaded"
```

**Step 2 - Artwork:**
```typescript
CardTitle: contains "Artwork"
Input: id="artwork-file" type="file"
Button: "Upload Artwork" or "✓ Artwork Uploaded"
```

**Step 3 - Metadata:**
```typescript
CardTitle: contains "Metadata"

// ISRC Field
Input: id="isrc" type="text"
- Disabled until uploadedMasterKey exists
- Real-time validation states:
  * '' (empty) - no feedback
  * 'typing' - shows "Continue typing..."
  * 'valid' - shows "✓ Valid ISRC format" (green)
  * 'invalid' - shows "✗ Invalid ISRC format..." (red)
- Border changes color based on state

// Genre Field (Radix UI Select)
SelectTrigger: id="genre"
- Disabled until uploadedMasterKey exists

// Explicit Content (Checkbox)
Checkbox: id="explicit"

// Submit Button
Button: "Complete Master Upload"
- Disabled until isFormComplete (master + artwork + isrc + genre)
```

**ISRC Validation Feedback:**
```typescript
// Real-time feedback elements (conditional rendering):
'Continue typing...'               // isrcValidation === 'typing'
'✓ Valid ISRC format'              // isrcValidation === 'valid'
'✗ Invalid ISRC format...'         // isrcValidation === 'invalid'
'Format: CC-XXX-YY-NNNNN'          // default hint
```

---

### 6. PRODUCTION FILES PAGE (`/project/{id}/files`)

**Page Identifiers:**
- H1: "Production Files"

**EmptyState (when no files):**
```typescript
title: "No Production Files"
icon: "📁" emoji
description: "Upload your master audio, stems, artwork..."
action button: "Upload First File"
```

---

### 7. TEASERS PAGE (`/project/{id}/teasers`)

**Page Identifiers:**
- P tag: "Teaser Content Tracker"

**EmptyState (when no teasers):**
```typescript
title: "No Teasers Posted"
icon: "🎬" emoji
description: "Start building anticipation..."
action button: "Add First Teaser"
```

---

### 8. BUDGET PAGE (`/project/{id}/budget`)

**Page Identifiers:**
- Text: "Budget Tracking"

---

## Key Interaction Patterns

### Radix UI Select Pattern
```typescript
// To select an option from a Radix UI Select:
1. Click the SelectTrigger (button with role="combobox")
2. Wait for dropdown animation
3. Click the SelectItem with desired text (role="option")

Example:
await page.click('button[role="combobox"]');
await page.waitForTimeout(500);
await page.click('[role="option"]:has-text("Album")');
```

### Radix UI Dialog (Modal) Pattern
```typescript
// Dialogs appear in Portal (outside normal DOM flow)
// Use text-based selectors:
await expect(page.getByText('Content Quota Not Met')).toBeVisible();

// Close modal:
await page.click('button:has-text("Cancel")');
// OR
await page.click('button:has-text("Close")');
```

### EmptyState Component Pattern
```typescript
// EmptyState always has:
- title (h3)
- description (p)
- optional icon (emoji span)
- optional action button (Link/Button)

// Detect presence:
await expect(page.getByText('No Content Yet')).toBeVisible();
```

### DashboardSkeleton Pattern
```typescript
// Appears during navigation.state === 'loading'
// Shows briefly when navigating to project dashboard
// Cannot reliably test (too fast), but verify page loads after
```

### ContentQuotaWidget Pattern
```typescript
// Part of 4-column grid on dashboard
// Look for CardTitle: "Content Quotas"
await expect(page.getByText('Content Quotas')).toBeVisible();
```

---

## Testing Strategy

### For Interactive Workflow Tests:

1. **Create Project Flow:**
   - Fill all form fields using ID selectors
   - Use Radix Select pattern for release_type
   - Wait for navigation to project dashboard
   - Extract projectId from URL

2. **Dashboard Verification:**
   - Check all 4 cards present
   - Verify BackButton visible
   - Verify navigation buttons present
   - Check ContentQuotaWidget rendered

3. **Milestone Interaction:**
   - Click first milestone link
   - Attempt to complete milestone
   - Check if modal appears (may not if quota met)
   - Close modal if appears

4. **ISRC Validation Testing:**
   - Navigate to master upload page
   - Try filling ISRC field (may be disabled)
   - Test validation states if enabled

5. **EmptyState Verification:**
   - Visit content, files, and teasers pages
   - Check for EmptyState components

---

## Common Gotchas

1. **Radix Select is NOT native select** - Must use click pattern, not selectOption()
2. **ISRC field disabled** until master audio uploaded
3. **Modals may not appear** if quota already met or no requirements
4. **EmptyState may not show** if data exists in DB
5. **DashboardSkeleton too fast** to reliably test in headed mode
6. **Navigation state** - Always wait for 'networkidle' or specific elements

---

## Recommended Test Selectors (Priority Order)

1. **ID selectors** (`#artist_name`) - Most reliable
2. **Text content** (`page.getByText('Budget')`) - Good for static text
3. **Role selectors** (`button[role="combobox"]`) - For Radix components
4. **Link with text** (`page.getByRole('link', { name: 'Master Upload' })`)
5. **Avoid CSS classes** - May change, less stable
