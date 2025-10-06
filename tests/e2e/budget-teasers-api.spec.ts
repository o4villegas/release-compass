import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://release-compass.lando555.workers.dev';

test.describe('Budget and Teasers API Production Tests', () => {
  let projectId: string;
  let userUuid: string;
  let receiptFileKey: string;

  test.beforeAll(async ({ request }) => {
    // Create a test project for Budget and Teasers tests
    userUuid = crypto.randomUUID();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 25); // 25 days for optimal teaser window

    const createProjectResponse = await request.post(`${BASE_URL}/api/projects`, {
      data: {
        artist_name: `Budget Test Artist ${Date.now()}`,
        release_title: `Budget Test Release ${Date.now()}`,
        release_type: 'single',
        release_date: futureDate.toISOString().split('T')[0],
        total_budget: 10000,
        user_uuid: userUuid,
      },
    });

    expect(createProjectResponse.status()).toBe(201);
    const projectData = await createProjectResponse.json();
    projectId = projectData.project.id;

    // Create a mock receipt file using a simple blob
    receiptFileKey = `receipts/test-receipt-${Date.now()}.pdf`;
    const formData = new FormData();
    const blob = new Blob(['test receipt content'], { type: 'application/pdf' });
    const file = new File([blob], 'test-receipt.pdf', { type: 'application/pdf' });

    formData.append('file', file);
    formData.append('project_id', projectId);
    formData.append('file_type', 'receipts');
    formData.append('user_uuid', userUuid);

    const uploadReceiptResponse = await request.post(`${BASE_URL}/api/files/upload`, {
      multipart: formData,
    });

    expect(uploadReceiptResponse.status()).toBe(201);
    const uploadData = await uploadReceiptResponse.json();
    receiptFileKey = uploadData.file.storage_key;
  });

  test.describe('Budget API', () => {
    test('POST /api/budget-items - rejects without receipt', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/budget-items`, {
        data: {
          project_id: projectId,
          category: 'production',
          description: 'Studio time',
          amount: 500,
          user_uuid: userUuid,
          // Missing receipt_file intentionally
        },
      });

      expect(response.status()).toBe(422);
      const data = await response.json();
      expect(data.error).toBe('RECEIPT_REQUIRED');
      expect(data.code).toBe('RECEIPT_REQUIRED');
      expect(data.userMessage).toContain('upload a receipt');
    });

    test('POST /api/budget-items - accepts with receipt', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/budget-items`, {
        data: {
          project_id: projectId,
          category: 'production',
          description: 'Studio time',
          amount: 500,
          receipt_file: receiptFileKey,
          user_uuid: userUuid,
        },
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.budget_item).toHaveProperty('id');
      expect(data.budget_item.category).toBe('production');
      expect(data.budget_item.amount).toBe(500);
      expect(data.budget_item.approval_status).toBe('pending');
    });

    test('POST /api/budget-items - validates category', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/budget-items`, {
        data: {
          project_id: projectId,
          category: 'invalid_category',
          description: 'Test',
          amount: 100,
          receipt_file: receiptFileKey,
          user_uuid: userUuid,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid category');
      expect(data.error).toContain('production');
      expect(data.error).toContain('marketing');
    });

    test('POST /api/budget-items - validates positive amount', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/budget-items`, {
        data: {
          project_id: projectId,
          category: 'marketing',
          description: 'Test',
          amount: -100,
          receipt_file: receiptFileKey,
          user_uuid: userUuid,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('greater than 0');
    });

    test('GET /api/projects/:projectId/budget - returns enhanced summary', async ({ request }) => {
      // Create a few budget items first
      await request.post(`${BASE_URL}/api/budget-items`, {
        data: {
          project_id: projectId,
          category: 'marketing',
          description: 'Social media ads',
          amount: 3000,
          receipt_file: receiptFileKey,
          user_uuid: userUuid,
        },
      });

      await request.post(`${BASE_URL}/api/budget-items`, {
        data: {
          project_id: projectId,
          category: 'content_creation',
          description: 'Video production',
          amount: 1000,
          receipt_file: receiptFileKey,
          user_uuid: userUuid,
        },
      });

      const response = await request.get(`${BASE_URL}/api/projects/${projectId}/budget`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.total_budget).toBe(10000);
      expect(data.total_spent).toBeGreaterThan(0);
      expect(data.remaining).toBeLessThan(10000);
      expect(data.percentage_spent).toBeGreaterThan(0);

      // Check category breakdown structure
      expect(data.by_category).toHaveProperty('production');
      expect(data.by_category).toHaveProperty('marketing');
      expect(data.by_category).toHaveProperty('content_creation');

      // Check recommended allocations
      expect(data.recommended_allocations.production).toBe(0.35);
      expect(data.recommended_allocations.marketing).toBe(0.30);

      // Verify marketing category has data
      expect(data.by_category.marketing.spent).toBe(3000);
      expect(data.by_category.marketing.recommended_amount).toBe(3000); // 30% of 10000
      expect(data.by_category.marketing.status).toBe('on-track');
    });

    test('GET /api/projects/:projectId/budget/alerts - generates alerts', async ({ request }) => {
      // Create overspending in a category
      await request.post(`${BASE_URL}/api/budget-items`, {
        data: {
          project_id: projectId,
          category: 'admin',
          description: 'Legal fees',
          amount: 2000, // Overspending on admin (recommended: 10% = $1000)
          receipt_file: receiptFileKey,
          user_uuid: userUuid,
        },
      });

      const response = await request.get(`${BASE_URL}/api/projects/${projectId}/budget/alerts`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('alerts');
      expect(data).toHaveProperty('alert_count');
      expect(data).toHaveProperty('has_critical');
      expect(data).toHaveProperty('has_warnings');

      // Should have warnings or critical alerts
      expect(data.alert_count).toBeGreaterThan(0);

      // Check alert structure if alerts exist
      if (data.alerts.length > 0) {
        const alert = data.alerts[0];
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('details');
      }
    });
  });

  test.describe('Teasers API', () => {
    test('POST /api/teasers - creates teaser post', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/teasers`, {
        data: {
          project_id: projectId,
          platform: 'TikTok',
          post_url: 'https://tiktok.com/@artist/video/123456',
          snippet_duration: 15,
          song_section: 'chorus',
          presave_link_included: true,
          user_uuid: userUuid,
        },
      });

      expect(response.status()).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.teaser).toHaveProperty('id');
      expect(data.teaser.platform).toBe('TikTok');
      expect(data.teaser.snippet_duration).toBe(15);

      // Check requirement status
      expect(data.requirement_status).toHaveProperty('total_teasers');
      expect(data.requirement_status.required).toBe(2);
      expect(data.requirement_status.met).toBe(false); // Only 1 teaser so far

      // Check posting window warning (should be in optimal window)
      expect(data.posting_window_warning).toBeNull();
    });

    test('POST /api/teasers - validates platform', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/teasers`, {
        data: {
          project_id: projectId,
          platform: 'MySpace', // Invalid platform
          post_url: 'https://example.com',
          snippet_duration: 15,
          song_section: 'verse',
          user_uuid: userUuid,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid platform');
      expect(data.error).toContain('TikTok');
    });

    test('POST /api/teasers - validates URL format', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/teasers`, {
        data: {
          project_id: projectId,
          platform: 'Instagram',
          post_url: 'not-a-url', // Invalid URL
          snippet_duration: 20,
          song_section: 'intro',
          user_uuid: userUuid,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('valid HTTP/HTTPS URL');
    });

    test('POST /api/teasers - validates snippet duration', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/teasers`, {
        data: {
          project_id: projectId,
          platform: 'YouTube',
          post_url: 'https://youtube.com/watch?v=test',
          snippet_duration: 3, // Too short
          song_section: 'bridge',
          user_uuid: userUuid,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('between 5 and 60 seconds');
    });

    test('GET /api/projects/:projectId/teasers - lists teasers with requirement', async ({ request }) => {
      // Create second teaser to meet requirement
      await request.post(`${BASE_URL}/api/teasers`, {
        data: {
          project_id: projectId,
          platform: 'Instagram',
          post_url: 'https://instagram.com/p/test123',
          snippet_duration: 30,
          song_section: 'verse',
          presave_link_included: false,
          user_uuid: userUuid,
        },
      });

      const response = await request.get(`${BASE_URL}/api/projects/${projectId}/teasers`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.teasers).toBeInstanceOf(Array);
      expect(data.count).toBeGreaterThanOrEqual(1); // At least 1 teaser exists

      // Check requirement status structure
      expect(data.requirement.required).toBe(2);
      expect(data.requirement).toHaveProperty('actual');
      expect(data.requirement).toHaveProperty('met');

      // Check optimal posting window
      expect(data.optimal_posting_window).toHaveProperty('start');
      expect(data.optimal_posting_window).toHaveProperty('end');
    });

    test('PATCH /api/teasers/:id/engagement - updates engagement metrics', async ({ request }) => {
      // First create a teaser
      const createResponse = await request.post(`${BASE_URL}/api/teasers`, {
        data: {
          project_id: projectId,
          platform: 'Twitter',
          post_url: 'https://twitter.com/artist/status/123',
          snippet_duration: 25,
          song_section: 'outro',
          user_uuid: userUuid,
        },
      });

      const teaser = (await createResponse.json()).teaser;

      // Update engagement
      const response = await request.patch(`${BASE_URL}/api/teasers/${teaser.id}/engagement`, {
        data: {
          views: 10000,
          likes: 500,
          shares: 50,
          comments: 100,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.engagement_metrics.views).toBe(10000);
      expect(data.engagement_metrics.likes).toBe(500);
      expect(data.engagement_metrics.shares).toBe(50);
      expect(data.engagement_metrics.comments).toBe(100);
    });
  });

  test.describe('Milestone Integration', () => {
    test.skip('Milestone integration requires milestone ID from database', async ({ request }) => {
      // Note: Full milestone integration testing requires:
      // 1. GET /api/projects/:id endpoint to return milestones array
      // 2. OR a GET /api/projects/:projectId/milestones endpoint
      // 3. Milestone IDs to test completion logic
      //
      // The milestone completion logic with teaser requirement checking is implemented
      // in workers/routes/milestones.ts:50-68 and verified via manual testing.
    });
  });
});
