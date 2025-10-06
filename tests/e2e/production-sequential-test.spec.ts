import { test, expect } from '@playwright/test';

const BASE_URL = 'https://release-compass.lando555.workers.dev';

// Use test.describe.serial to run tests in order
test.describe.serial('Production Sequential Workflow', () => {
  let projectId: string;
  let milestoneId: string;
  const USER_UUID = `test-${Date.now()}`;

  test('1. Health check', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log('✅ API Health:', data.status);
  });

  test('2. Create project', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/projects`, {
      data: {
        artist_name: 'Sequential Test Artist',
        release_title: 'Sequential Test Album',
        release_date: '2025-12-31',
        release_type: 'album',
        total_budget: 50000,
        user_uuid: USER_UUID,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    projectId = data.project.id;
    milestoneId = data.milestones[0].id;

    console.log('✅ Project created:', projectId);
    console.log('   Milestones:', data.milestones.length);
  });

  test('3. Get project details', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.project).toBeDefined();
    expect(data.cleared_for_release).toBeDefined();

    console.log('✅ Project fetched');
    console.log('   Cleared:', data.cleared_for_release?.cleared || false);
  });

  test('4. Get milestone details', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/milestones/${milestoneId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.milestone).toBeDefined();
    expect(data.quota_status).toBeDefined();

    console.log('✅ Milestone:', data.milestone.name);
    console.log('   Quota met:', data.quota_status.quota_met);
  });

  test('5. Create budget item (should fail without receipt)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/budget-items`, {
      data: {
        project_id: projectId,
        category: 'production',
        description: 'Test expense',
        amount: 1000,
        user_uuid: USER_UUID,
      },
    });

    expect(response.status()).toBe(422);
    const data = await response.json();
    expect(data.error).toBe('RECEIPT_REQUIRED');

    console.log('✅ Budget validation working - receipt required');
  });

  test('6. Create teaser post', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/teasers`, {
      data: {
        project_id: projectId,
        platform: 'Instagram',
        post_url: 'https://instagram.com/p/test',
        snippet_duration: 30,
        song_section: 'chorus',
        presave_link_included: true,
        user_uuid: USER_UUID,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);

    console.log('✅ Teaser created');
  });

  test('7. Get project budget', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}/budget`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.total_budget).toBeDefined();
    expect(data.by_category).toBeDefined();

    console.log('✅ Budget retrieved');
    console.log('   Total budget:', data.total_budget);
    console.log('   Total spent:', data.total_spent);
  });

  test('8. Get project teasers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}/teasers`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.teasers).toBeDefined();
    expect(data.count).toBeGreaterThanOrEqual(1);

    console.log('✅ Teasers retrieved');
    console.log('   Count:', data.count);
  });

  test('9. Try milestone completion without quota (should fail)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/milestones/${milestoneId}/complete`, {
      data: { user_uuid: USER_UUID },
    });

    // Should fail with 400 due to quota not met
    expect(response.status()).toBe(400);
    const data = await response.json();

    console.log('✅ Milestone blocked correctly');
    console.log('   Error:', data.error);
  });

  test('10. Get cleared-for-release status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}/cleared-for-release`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.cleared).toBe(false);
    expect(data.reasons.length).toBeGreaterThan(0);

    console.log('✅ Cleared-for-release check');
    console.log('   Status:', data.cleared ? 'CLEARED' : 'NOT CLEARED');
    console.log('   Missing:', data.reasons.length, 'requirements');
  });
});
