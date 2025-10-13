import { test, expect } from '@playwright/test';

test.describe('Phase 2: Production Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('P0: Badge outline visibility - Pending milestone badges', async ({ page }) => {
    // Navigate to demo project (production UUID)
    await page.goto('/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Test Album")');

    // Find a "Pending" milestone badge
    const pendingBadge = page.locator('text=Pending').first();
    await expect(pendingBadge).toBeVisible();

    // Get computed styles to verify background color
    const backgroundColor = await pendingBadge.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Verify it's not transparent (should be rgb with values, not rgba(0,0,0,0))
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(backgroundColor).not.toBe('transparent');

    console.log(`✅ Badge background color: ${backgroundColor}`);
  });

  test('P1.1: Button sizing consistency - All form submit buttons are 40px', async ({ page }) => {
    const projectId = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

    // Test 1: Files upload form
    await page.goto(`/project/${projectId}/files`);
    await page.waitForSelector('h1:has-text("Test Album")');

    const filesButton = page.locator('button[type="submit"]:has-text("Upload File")');
    const filesHeight = await filesButton.evaluate((el) => {
      return window.getComputedStyle(el).height;
    });
    expect(filesHeight).toBe('40px');
    console.log(`✅ Files submit button: ${filesHeight}`);

    // Test 2: Teasers form
    await page.goto(`/project/${projectId}/teasers`);
    await page.waitForSelector('h1:has-text("Test Album")');

    const teasersButton = page.locator('button[type="submit"]:has-text("Post Teaser")');
    const teasersHeight = await teasersButton.evaluate((el) => {
      return window.getComputedStyle(el).height;
    });
    expect(teasersHeight).toBe('40px');
    console.log(`✅ Teasers submit button: ${teasersHeight}`);

    // Test 3: Master upload form
    await page.goto(`/project/${projectId}/master`);
    await page.waitForSelector('h1:has-text("Test Album")');

    const masterButton = page.locator('button[type="submit"]:has-text("Upload Master")');
    const masterHeight = await masterButton.evaluate((el) => {
      return window.getComputedStyle(el).height;
    });
    expect(masterHeight).toBe('40px');
    console.log(`✅ Master submit button: ${masterHeight}`);

    // Test 4: Budget form
    await page.goto(`/project/${projectId}/budget`);
    await page.waitForSelector('h1:has-text("Test Album")');

    const budgetButton = page.locator('button[type="submit"]:has-text("Add Budget Item")');
    const budgetHeight = await budgetButton.evaluate((el) => {
      return window.getComputedStyle(el).height;
    });
    expect(budgetHeight).toBe('40px');
    console.log(`✅ Budget submit button: ${budgetHeight}`);

    // Test 5: Content upload (on content page)
    await page.goto(`/project/${projectId}/content`);
    await page.waitForSelector('h1:has-text("Test Album")');

    const contentButton = page.locator('button[type="submit"]:has-text("Upload Content")');
    const contentHeight = await contentButton.evaluate((el) => {
      return window.getComputedStyle(el).height;
    });
    expect(contentHeight).toBe('40px');
    console.log(`✅ Content submit button: ${contentHeight}`);
  });

  test('P1.2: Focus indicator consistency - All inputs use .focus-glow', async ({ page }) => {
    // Test on Create Project form (has multiple inputs)
    await page.goto('/create-project');
    await page.waitForSelector('h1:has-text("Create New Project")');

    // Find the artist name input
    const artistInput = page.locator('input#artist-name');
    await expect(artistInput).toBeVisible();

    // Focus the input
    await artistInput.focus();

    // Get box-shadow to verify .focus-glow is applied
    const boxShadow = await artistInput.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });

    // Verify it has the glow effect (should contain "rgba(0, 255, 65" for neon green)
    expect(boxShadow).toContain('rgba(0, 255, 65');
    console.log(`✅ Input focus-glow box-shadow: ${boxShadow.substring(0, 100)}...`);

    // Test release title input
    const titleInput = page.locator('input#release-title');
    await titleInput.focus();

    const titleBoxShadow = await titleInput.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });
    expect(titleBoxShadow).toContain('rgba(0, 255, 65');
    console.log(`✅ Title input focus-glow verified`);

    // Test budget input (number type)
    const budgetInput = page.locator('input#total-budget');
    await budgetInput.focus();

    const budgetBoxShadow = await budgetInput.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });
    expect(budgetBoxShadow).toContain('rgba(0, 255, 65');
    console.log(`✅ Budget input focus-glow verified`);
  });

  test('P0: Badge outline visibility - Content type badges', async ({ page }) => {
    const projectId = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

    // Navigate to content page (has content type badges)
    await page.goto(`/project/${projectId}/content`);
    await page.waitForSelector('h1:has-text("Test Album")');

    // Find any badge with outline variant (content type badges)
    const badges = page.locator('.border-border'); // This is the class added to outline badges
    const count = await badges.count();

    if (count > 0) {
      const firstBadge = badges.first();
      const backgroundColor = await firstBadge.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Verify it has background color
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('transparent');
      console.log(`✅ Content type badge background: ${backgroundColor}`);
    } else {
      console.log(`⚠️  No content type badges found on page (may not have content yet)`);
    }
  });

  test('Visual regression: Overall page appearance', async ({ page }) => {
    const projectId = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

    // Check project dashboard loads correctly
    await page.goto(`/project/${projectId}`);
    await page.waitForSelector('h1:has-text("Test Album")');

    // Verify key UI elements are visible
    await expect(page.locator('text=Pending').first()).toBeVisible();
    await expect(page.locator('text=Budget Overview')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();

    console.log(`✅ Project dashboard renders correctly`);

    // Check files page
    await page.goto(`/project/${projectId}/files`);
    await page.waitForSelector('h1:has-text("Test Album")');
    await expect(page.locator('button:has-text("Upload File")')).toBeVisible();
    console.log(`✅ Files page renders correctly`);

    // Check budget page
    await page.goto(`/project/${projectId}/budget`);
    await page.waitForSelector('h1:has-text("Test Album")');
    await expect(page.locator('text=Total Budget')).toBeVisible();
    await expect(page.locator('button:has-text("Add Budget Item")')).toBeVisible();
    console.log(`✅ Budget page renders correctly`);
  });
});
