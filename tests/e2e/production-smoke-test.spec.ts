import { test, expect } from '@playwright/test';

// Production URL - will be set via environment variable or default to workers.dev
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://release-compass.lando555.workers.dev';

test.describe('Production Deployment Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check that the page loads without 404
    expect(page.url()).toBe(BASE_URL + '/');

    // Check for key elements
    await expect(page.locator('h1')).toContainText('Release Compass');
    await expect(page.getByText('Create New Project')).toBeVisible();
  });

  test('create project page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/create-project`);

    // Verify no 404 errors
    expect(page.url()).toContain('/create-project');

    // Check form elements exist
    await expect(page.getByLabel(/artist name/i)).toBeVisible();
    await expect(page.getByLabel(/release title/i)).toBeVisible();
    await expect(page.getByLabel(/release date/i)).toBeVisible();
  });

  test('API endpoints respond correctly', async ({ request }) => {
    // Test a simple API endpoint - this will fail if no projects exist, but should not 404
    const response = await request.get(`${BASE_URL}/api/projects`);

    // Should not be 404
    expect(response.status()).not.toBe(404);
  });

  test('no .data 404 errors on navigation', async ({ page }) => {
    // Listen for failed requests
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('.data')) {
        failedRequests.push(response.url());
      }
    });

    // Navigate through the app
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Click to create project page
    await page.getByText('Create New Project').click();
    await page.waitForLoadState('networkidle');

    // Go back home
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify no .data 404 errors occurred
    expect(failedRequests).toHaveLength(0);
  });

  test('can create a project end-to-end', async ({ page }) => {
    await page.goto(`${BASE_URL}/create-project`);

    // Fill out the form
    const timestamp = Date.now();
    await page.getByLabel(/artist name/i).fill(`Test Artist ${timestamp}`);
    await page.getByLabel(/release title/i).fill(`Test Album ${timestamp}`);

    // Set release date to 90 days in the future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.getByLabel(/release date/i).fill(dateString);

    // Select release type
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /album/i }).click();

    // Set budget
    await page.getByLabel(/budget/i).fill('25000');

    // Submit form
    await page.getByRole('button', { name: /create project/i }).click();

    // Should redirect to project dashboard
    await page.waitForURL(/\/project\/[a-f0-9-]+/);

    // Verify project dashboard loads
    await expect(page.locator('h1')).toContainText(`Test Album ${timestamp}`);
    await expect(page.getByText(`Test Artist ${timestamp}`)).toBeVisible();

    // Verify milestones are generated
    await expect(page.getByText(/Recording Complete/i)).toBeVisible();
    await expect(page.getByText(/Mastering Complete/i)).toBeVisible();
  });

  test('Phase 2: Content Library navigation works', async ({ page }) => {
    // First create a project
    await page.goto(`${BASE_URL}/create-project`);

    const timestamp = Date.now();
    await page.getByLabel(/artist name/i).fill(`Content Test ${timestamp}`);
    await page.getByLabel(/release title/i).fill(`Album ${timestamp}`);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    await page.getByLabel(/release date/i).fill(futureDate.toISOString().split('T')[0]);

    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /single/i }).click();

    await page.getByLabel(/budget/i).fill('10000');
    await page.getByRole('button', { name: /create project/i }).click();

    // Wait for redirect to project page
    await page.waitForURL(/\/project\/[a-f0-9-]+/);

    // Click View Content Library button
    await page.getByRole('link', { name: /view content library/i }).click();

    // Should navigate to content page
    await page.waitForURL(/\/project\/[a-f0-9-]+\/content/);

    // Verify content library page loads
    await expect(page.getByText(/Total Content/i)).toBeVisible();
    await expect(page.getByRole('tab', { name: /upload content/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /content library/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /by milestone/i })).toBeVisible();
  });

  test('Phase 2: Milestone detail page loads', async ({ page }) => {
    // Create a project first
    await page.goto(`${BASE_URL}/create-project`);

    const timestamp = Date.now();
    await page.getByLabel(/artist name/i).fill(`Milestone Test ${timestamp}`);
    await page.getByLabel(/release title/i).fill(`EP ${timestamp}`);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    await page.getByLabel(/release date/i).fill(futureDate.toISOString().split('T')[0]);

    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /ep/i }).click();

    await page.getByLabel(/budget/i).fill('15000');
    await page.getByRole('button', { name: /create project/i }).click();

    await page.waitForURL(/\/project\/[a-f0-9-]+/);

    // Click on first "View Details" button in milestones table
    await page.getByRole('button', { name: /view details/i }).first().click();

    // Should navigate to milestone detail page
    await page.waitForURL(/\/milestone\/[a-f0-9-]+/);

    // Verify milestone detail page loaded
    await expect(page.getByText(/Content Requirements/i)).toBeVisible();
    await expect(page.getByText(/Quota Status/i)).toBeVisible();

    // The breakthrough feature: Mark Complete button should be disabled initially
    const completeButton = page.getByRole('button', { name: /mark as complete/i });
    await expect(completeButton).toBeVisible();
    await expect(completeButton).toBeDisabled(); // Disabled because quota not met
  });

  test('Phase 2: Upload form renders correctly', async ({ page }) => {
    // Create a project and navigate to content library
    await page.goto(`${BASE_URL}/create-project`);

    const timestamp = Date.now();
    await page.getByLabel(/artist name/i).fill(`Upload Test ${timestamp}`);
    await page.getByLabel(/release title/i).fill(`Test ${timestamp}`);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    await page.getByLabel(/release date/i).fill(futureDate.toISOString().split('T')[0]);

    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /single/i }).click();

    await page.getByLabel(/budget/i).fill('5000');
    await page.getByRole('button', { name: /create project/i }).click();

    await page.waitForURL(/\/project\/[a-f0-9-]+/);
    await page.getByRole('link', { name: /view content library/i }).click();
    await page.waitForURL(/\/project\/[a-f0-9-]+\/content/);

    // Click Upload Content tab
    await page.getByRole('tab', { name: /upload content/i }).click();

    // Verify upload form elements
    await expect(page.getByLabel(/content type/i)).toBeVisible();
    await expect(page.getByLabel(/file/i)).toBeVisible();
    await expect(page.getByLabel(/capture context/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /upload content/i })).toBeVisible();
  });
});
