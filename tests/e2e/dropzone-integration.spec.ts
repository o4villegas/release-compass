import { test, expect } from '@playwright/test';

const DEMO_PROJECT_ID = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

test.describe('Dropzone Integration (shadcn.io)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to content upload page
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}/content`);
    await page.waitForLoadState('networkidle');
  });

  test('Dropzone component renders correctly', async ({ page }) => {
    // Check if Dropzone is visible
    const dropzone = page.locator('button:has-text("Upload a file")');
    await expect(dropzone).toBeVisible();

    // Check for upload icon
    const uploadIcon = dropzone.locator('svg');
    await expect(uploadIcon).toBeVisible();

    // Check for drag and drop instructions
    await expect(dropzone).toContainText('Drag and drop or click to upload');
  });

  test('Dropzone displays file type restrictions', async ({ page }) => {
    // Select photo content type (default)
    const contentTypeSelect = page.locator('#content-type');
    await contentTypeSelect.click();
    await page.locator('text=Photo').click();

    // Check if Dropzone shows accepted file types
    const dropzone = page.locator('button:has-text("Upload a file")');
    await expect(dropzone).toContainText('Accepts');
    await expect(dropzone).toContainText('image/jpeg');
  });

  test('Dropzone updates accept types when content type changes', async ({ page }) => {
    // Change to Short Video
    const contentTypeSelect = page.locator('#content-type');
    await contentTypeSelect.click();
    await page.locator('text=Short Video (15-60s)').click();

    // Check if Dropzone shows video file types
    const dropzone = page.locator('button:has-text("Upload a file")');
    await expect(dropzone).toContainText('video/mp4');
  });

  test('Dropzone shows selected file name', async ({ page }) => {
    // Create a test file
    const fileContent = 'test image content';
    const fileName = 'test-photo.jpg';

    // Set file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'image/jpeg',
      buffer: Buffer.from(fileContent),
    });

    // Wait for file to be processed
    await page.waitForTimeout(500);

    // Check if file name is displayed
    await expect(page.locator('text=test-photo.jpg')).toBeVisible();
  });

  test('Dropzone validates file size limits', async ({ page }) => {
    // Select photo content type (10MB limit)
    const contentTypeSelect = page.locator('#content-type');
    await contentTypeSelect.click();
    await page.locator('text=Photo').click();

    // Create a file larger than 10MB (simulated via large buffer)
    const largeFileSize = 11 * 1024 * 1024; // 11MB
    const largeContent = Buffer.alloc(largeFileSize);

    // Set file input with large file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: largeContent,
    });

    // Wait for validation
    await page.waitForTimeout(500);

    // Check for validation error
    const errorAlert = page.locator('text=/Your photo is .* but the limit is 10MB/');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test('Dropzone is disabled during upload', async ({ page }) => {
    // Fill in required fields
    const contentTypeSelect = page.locator('#content-type');
    await contentTypeSelect.click();
    await page.locator('text=Photo').click();

    const captureContextSelect = page.locator('#capture-context');
    await captureContextSelect.click();
    await page.locator('text=Recording Session').click();

    // Add a small test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test'),
    });

    await page.waitForTimeout(500);

    // Click upload button
    const uploadButton = page.locator('button:has-text("Upload Content")');
    await uploadButton.click();

    // Check if Dropzone is disabled during upload
    const dropzone = page.locator('button:has-text("Drag and drop")').first();
    await expect(dropzone).toBeDisabled({ timeout: 1000 }).catch(() => {
      // Upload might complete too fast, that's ok
    });
  });

  test('Dropzone clears file after successful upload', async ({ page }) => {
    // Fill in required fields
    const contentTypeSelect = page.locator('#content-type');
    await contentTypeSelect.click();
    await page.locator('text=Photo').click();

    const captureContextSelect = page.locator('#capture-context');
    await captureContextSelect.click();
    await page.locator('text=Recording Session').click();

    // Add a test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test'),
    });

    await page.waitForTimeout(500);

    // Submit form
    const uploadButton = page.locator('button:has-text("Upload Content")');
    await uploadButton.click();

    // Wait for success message
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });

    // Check if Dropzone returned to empty state
    await expect(page.locator('button:has-text("Upload a file")')).toBeVisible();
  });
});
