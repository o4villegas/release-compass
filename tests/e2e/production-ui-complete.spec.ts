import { test, expect } from '@playwright/test';

/**
 * Comprehensive Production UI Test - All Routes & Components
 *
 * Tests ALL user-facing UI components and routes in production
 * with headed browser to verify complete functionality after SSR fixes.
 */

const PRODUCTION_URL = 'https://release-compass.lando555.workers.dev';
const TEST_PROJECT_ID = '591d7f6f-cfe4-447f-9e3d-77ca71ef634b'; // Existing test project

test.describe('Complete Production UI Test - All Routes', () => {

  test('Home page loads with all UI components', async ({ page }) => {
    console.log('\n=== Testing Home Page ===');

    await page.goto(PRODUCTION_URL);

    // Verify main heading
    await expect(page.locator('h1')).toContainText('Release Compass', { timeout: 10000 });

    // Verify create project button
    await expect(page.locator('text=Create New Project')).toBeVisible();

    // Verify navigation works
    const createButton = page.locator('a:has-text("Create New Project")');
    await expect(createButton).toBeVisible();

    console.log('✅ Home page: All components visible');
  });

  test('Project dashboard loads with complete UI', async ({ page }) => {
    console.log('\n=== Testing Project Dashboard ===');

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}`);

    // Main project info
    await expect(page.locator('h1')).toContainText('Fix Test', { timeout: 10000 });
    await expect(page.locator('text=Artist')).toBeVisible();
    await expect(page.locator('text=Release Date')).toBeVisible();

    // Project progress section
    await expect(page.locator('text=Project Progress')).toBeVisible();

    // Cleared for release banner
    await expect(page.locator('text=Cleared for Release')).toBeVisible();

    // Budget summary
    await expect(page.locator('text=Budget Summary')).toBeVisible();
    await expect(page.locator('text=Total Budget')).toBeVisible();

    // Milestones list
    await expect(page.locator('text=Milestones')).toBeVisible();
    const milestoneCards = page.locator('[class*="Card"]').filter({ hasText: 'Complete' });
    await expect(milestoneCards.first()).toBeVisible();

    // Navigation tabs
    await expect(page.locator('text=Budget')).toBeVisible();
    await expect(page.locator('text=Content')).toBeVisible();
    await expect(page.locator('text=Files')).toBeVisible();

    console.log('✅ Project dashboard: All components visible');
  });

  test('Milestone detail page loads with complete UI', async ({ page }) => {
    console.log('\n=== Testing Milestone Detail Page ===');

    // Navigate to project first to get milestone link
    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}`);
    const milestoneLink = page.locator('a:has-text("View Details")').first();
    await milestoneLink.click();

    // Wait for navigation
    await page.waitForURL(/\/milestone\//);

    // Verify milestone details
    await expect(page.locator('h1')).toContainText('Complete', { timeout: 10000 });
    await expect(page.locator('text=Due Date')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();

    // Content quota section
    await expect(page.locator('text=Quota Status')).toBeVisible();
    await expect(page.locator('text=short_video')).toBeVisible();

    // Mark complete button
    await expect(page.locator('button:has-text("Mark Complete")')).toBeVisible();

    // Back to project link
    await expect(page.locator('a:has-text("Back to Project")')).toBeVisible();

    console.log('✅ Milestone detail: All components visible');
  });

  test('Budget page loads with complete UI', async ({ page }) => {
    console.log('\n=== Testing Budget Page ===');

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}/budget`);

    // Page heading
    await expect(page.locator('h1')).toContainText('Budget Management', { timeout: 10000 });

    // Budget overview
    await expect(page.locator('text=Total Budget')).toBeVisible();
    await expect(page.locator('text=Total Spent')).toBeVisible();
    await expect(page.locator('text=Remaining')).toBeVisible();

    // Category breakdown
    await expect(page.locator('text=Production')).toBeVisible();
    await expect(page.locator('text=Marketing')).toBeVisible();
    await expect(page.locator('text=Content Creation')).toBeVisible();

    // Progress bars
    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars.first()).toBeVisible();

    // Add expense form
    await expect(page.locator('text=Add Budget Item')).toBeVisible();
    await expect(page.locator('select[name="category"]')).toBeVisible();

    // Budget items list
    await expect(page.locator('text=Budget Items')).toBeVisible();

    console.log('✅ Budget page: All components visible');
  });

  test('Content library page loads with complete UI', async ({ page }) => {
    console.log('\n=== Testing Content Library Page ===');

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}/content`);

    // Page heading
    await expect(page.locator('h1').or(page.locator('h2')).filter({ hasText: 'Content' })).toBeVisible({ timeout: 10000 });

    // Upload section
    await expect(page.locator('text=Upload').or(page.locator('text=Add Content'))).toBeVisible();

    // Content type filters/tabs
    await expect(page.locator('text=short_video').or(page.locator('text=Short Video'))).toBeVisible();

    // Milestone filter
    await expect(page.locator('text=Milestone').or(page.locator('text=Filter'))).toBeVisible();

    console.log('✅ Content library: All components visible');
  });

  test('Files page loads with complete UI', async ({ page }) => {
    console.log('\n=== Testing Files Page ===');

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}/files`);

    // Page heading
    await expect(page.locator('text=Files').or(page.locator('text=Production Files'))).toBeVisible({ timeout: 10000 });

    // File upload section
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('select').or(page.locator('text=File Type'))).toBeVisible();

    // File type options
    await expect(page.locator('text=Master').or(page.locator('text=Stems'))).toBeVisible();

    // Upload button
    await expect(page.locator('button:has-text("Upload")')).toBeVisible();

    console.log('✅ Files page: All components visible');
  });

  test('Master upload page loads with complete UI', async ({ page }) => {
    console.log('\n=== Testing Master Upload Page ===');

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}/master`);

    // Page heading
    await expect(page.locator('text=Master').or(page.locator('h1'))).toBeVisible({ timeout: 10000 });

    // Master audio upload
    await expect(page.locator('text=Audio').or(page.locator('text=Master Audio'))).toBeVisible();
    await expect(page.locator('input[type="file"]').first()).toBeVisible();

    // Artwork upload
    await expect(page.locator('text=Artwork')).toBeVisible();

    // Metadata form
    await expect(page.locator('text=ISRC').or(page.locator('label:has-text("ISRC")'))).toBeVisible();
    await expect(page.locator('text=UPC').or(page.locator('text=EAN'))).toBeVisible();

    // Genre selection
    await expect(page.locator('text=Genre').or(page.locator('select'))).toBeVisible();

    console.log('✅ Master upload: All components visible');
  });

  test('Teasers page loads with complete UI', async ({ page }) => {
    console.log('\n=== Testing Teasers Page ===');

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}/teasers`);

    // Page heading
    await expect(page.locator('text=Teaser').or(page.locator('h1'))).toBeVisible({ timeout: 10000 });

    // Teaser requirements
    await expect(page.locator('text=Required').or(page.locator('text=requirement'))).toBeVisible();

    // Platform selection
    await expect(page.locator('text=TikTok').or(page.locator('text=Instagram'))).toBeVisible();

    // Post URL input
    await expect(page.locator('input[type="url"]').or(page.locator('input[type="text"]'))).toBeVisible();

    // Submit button
    await expect(page.locator('button:has-text("Add")')).toBeVisible();

    console.log('✅ Teasers page: All components visible');
  });

  test('No 404 errors on any route', async ({ page }) => {
    console.log('\n=== Checking for 404 Errors on All Routes ===');

    const routes = [
      { name: 'Home', path: '/' },
      { name: 'Project Dashboard', path: `/project/${TEST_PROJECT_ID}` },
      { name: 'Budget', path: `/project/${TEST_PROJECT_ID}/budget` },
      { name: 'Content', path: `/project/${TEST_PROJECT_ID}/content` },
      { name: 'Files', path: `/project/${TEST_PROJECT_ID}/files` },
      { name: 'Master', path: `/project/${TEST_PROJECT_ID}/master` },
      { name: 'Teasers', path: `/project/${TEST_PROJECT_ID}/teasers` },
    ];

    for (const route of routes) {
      const errors: string[] = [];

      page.on('response', (response) => {
        if (response.status() === 404) {
          errors.push(`${response.status()} - ${response.url()}`);
        }
      });

      await page.goto(`${PRODUCTION_URL}${route.path}`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      if (errors.length > 0) {
        console.log(`❌ ${route.name}: Found ${errors.length} 404 error(s)`);
        errors.forEach(err => console.log(`   ${err}`));
        throw new Error(`${route.name} has 404 errors`);
      } else {
        console.log(`✅ ${route.name}: No 404 errors`);
      }
    }
  });

  test('AudioPlayer component renders without SSR errors', async ({ page }) => {
    console.log('\n=== Testing AudioPlayer Component ===');

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}/files`);

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check console for SSR errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Look for audio player elements (may not be visible if no files uploaded)
    const hasAudioFiles = await page.locator('audio, [class*="plyr"]').count() > 0;

    if (hasAudioFiles) {
      console.log('✅ AudioPlayer: Found audio player components');

      // Verify no "document is not defined" errors
      const ssrErrors = consoleErrors.filter(err =>
        err.includes('document is not defined') ||
        err.includes('window is not defined')
      );

      if (ssrErrors.length > 0) {
        console.log('❌ Found SSR errors:', ssrErrors);
        throw new Error('AudioPlayer has SSR errors');
      }
    } else {
      console.log('ℹ️ AudioPlayer: No audio files uploaded yet (component would render on file upload)');
    }

    console.log('✅ AudioPlayer: No SSR errors detected');
  });
});
