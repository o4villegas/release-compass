import { test, expect } from '@playwright/test';

const BASE_URL = 'https://release-compass.lando555.workers.dev';
const USER_UUID = `test-user-${Date.now()}`;

let projectId: string;
let milestoneId: string;
let masterFileId: string;
let contentItemId: string;

test.describe('Production Full Workflow Test', () => {
  test('1. Create new project', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/projects`, {
      data: {
        artist_name: 'Test Artist Full',
        release_title: 'Full Test Album',
        release_date: '2025-12-31',
        release_type: 'album',
        total_budget: 50000,
        user_uuid: USER_UUID,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.project).toBeDefined();
    expect(data.project.id).toBeDefined();
    expect(data.milestones).toBeDefined();
    expect(data.milestones.length).toBeGreaterThan(0);

    projectId = data.project.id;
    milestoneId = data.milestones[0].id;

    console.log('✅ Project created:', projectId);
    console.log('✅ Milestones generated:', data.milestones.length);
  });

  test('2. Verify project has cleared-for-release status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.cleared_for_release).toBeDefined();
    expect(data.cleared_for_release.cleared).toBe(false);
    expect(data.cleared_for_release.reasons.length).toBeGreaterThan(0);

    console.log('✅ Cleared-for-release status:', data.cleared_for_release.cleared);
    console.log('   Missing requirements:', data.cleared_for_release.reasons.length);
  });

  test('3. Get milestone with quota requirements', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/milestones/${milestoneId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.milestone).toBeDefined();
    expect(data.content_requirements).toBeDefined();
    expect(data.quota_status).toBeDefined();
    expect(data.quota_status.quota_met).toBe(false);

    console.log('✅ Milestone:', data.milestone.name);
    console.log('   Content requirements:', data.content_requirements.length);
    console.log('   Quota met:', data.quota_status.quota_met);
  });

  test('4. Upload content item', async ({ request }) => {
    // Create a test image blob
    const blob = new Blob(['fake image data'], { type: 'image/jpeg' });
    const file = new File([blob], 'test-photo.jpg', { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    formData.append('milestone_id', milestoneId);
    formData.append('content_type', 'photo');
    formData.append('capture_context', 'recording_session');
    formData.append('user_uuid', USER_UUID);

    const response = await request.post(`${BASE_URL}/api/content/upload`, {
      multipart: formData as any,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.content).toBeDefined();
    expect(data.content.id).toBeDefined();
    expect(data.quota_status).toBeDefined();

    contentItemId = data.content.id;

    console.log('✅ Content uploaded:', contentItemId);
    console.log('   Quota status:', data.quota_status.quota_met ? 'MET' : 'NOT MET');
  });

  test('5. Upload master audio file', async ({ request }) => {
    const blob = new Blob(['fake audio data'], { type: 'audio/wav' });
    const file = new File([blob], 'master.wav', { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    formData.append('file_type', 'master');
    formData.append('user_uuid', USER_UUID);

    const response = await request.post(`${BASE_URL}/api/files/upload`, {
      multipart: formData as any,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.file).toBeDefined();
    expect(data.file.id).toBeDefined();

    masterFileId = data.file.id;

    console.log('✅ Master file uploaded:', masterFileId);
  });

  test('6. Add metadata to master file', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/files/${masterFileId}/metadata`, {
      data: {
        isrc: 'US-S1Z-24-00001',
        genre: 'Rock',
        explicit_content: false,
        user_uuid: USER_UUID,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.metadata).toBeDefined();
    expect(data.metadata.isrc).toBe('US-S1Z-24-00001');

    console.log('✅ Master metadata added');
    console.log('   ISRC:', data.metadata.isrc);
    console.log('   Genre:', data.metadata.genre);
  });

  test('7. Upload artwork file', async ({ request }) => {
    const blob = new Blob(['fake artwork data'], { type: 'image/png' });
    const file = new File([blob], 'artwork.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    formData.append('file_type', 'artwork');
    formData.append('user_uuid', USER_UUID);

    const response = await request.post(`${BASE_URL}/api/files/upload`, {
      multipart: formData as any,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.file).toBeDefined();

    console.log('✅ Artwork uploaded:', data.file.id);
  });

  test('8. Add timestamp note to master file', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/files/${masterFileId}/notes`, {
      data: {
        timestamp_seconds: 45,
        note_text: 'Test feedback note at 0:45',
        user_uuid: USER_UUID,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.note).toBeDefined();
    expect(data.note.timestamp_seconds).toBe(45);

    console.log('✅ Timestamp note added');
  });

  test('9. Get file notes', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/files/${masterFileId}/notes`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.notes).toBeDefined();
    expect(data.notes.length).toBeGreaterThan(0);
    expect(data.count).toBeGreaterThan(0);

    console.log('✅ File notes retrieved:', data.count);
  });

  test('10. Try to complete milestone without quota (should fail)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/milestones/${milestoneId}/complete`, {
      data: {
        user_uuid: USER_UUID,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();

    expect(data.error).toBeDefined();
    // Should be QUOTA_NOT_MET or NOTES_NOT_ACKNOWLEDGED
    expect(['QUOTA_NOT_MET', 'NOTES_NOT_ACKNOWLEDGED']).toContain(data.error);

    console.log('✅ Milestone completion blocked:', data.error);
  });

  test('11. Create budget item with receipt', async ({ request }) => {
    // Upload receipt first
    const blob = new Blob(['fake receipt'], { type: 'application/pdf' });
    const file = new File([blob], 'receipt.pdf', { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    formData.append('file_type', 'receipts');
    formData.append('user_uuid', USER_UUID);

    const receiptResponse = await request.post(`${BASE_URL}/api/files/upload`, {
      multipart: formData as any,
    });

    expect(receiptResponse.status()).toBe(201);
    const receiptData = await receiptResponse.json();
    const receiptKey = receiptData.file.storage_key;

    // Now create budget item
    const budgetResponse = await request.post(`${BASE_URL}/api/budget-items`, {
      data: {
        project_id: projectId,
        category: 'production',
        description: 'Studio time',
        amount: 1000,
        receipt_file: receiptKey,
        user_uuid: USER_UUID,
      },
    });

    expect(budgetResponse.status()).toBe(201);
    const budgetData = await budgetResponse.json();

    expect(budgetData.success).toBe(true);

    console.log('✅ Budget item created with receipt');
  });

  test('12. Create teaser post', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/teaser-posts`, {
      data: {
        project_id: projectId,
        platform: 'Instagram',
        post_url: 'https://instagram.com/p/test123',
        caption: 'Test teaser caption',
        posted_at: new Date().toISOString(),
        user_uuid: USER_UUID,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.teaser).toBeDefined();

    console.log('✅ Teaser post created');
  });

  test('13. Get budget summary', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}/budget`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.items).toBeDefined();
    expect(data.total_spent).toBeGreaterThan(0);

    console.log('✅ Budget summary retrieved');
    console.log('   Total spent:', data.total_spent);
  });

  test('14. Get teasers summary', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}/teasers`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.teasers).toBeDefined();
    expect(data.count).toBeGreaterThan(0);

    console.log('✅ Teasers summary retrieved');
    console.log('   Teaser count:', data.count);
  });

  test('15. Get content library', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}/content`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.content).toBeDefined();
    expect(data.content.length).toBeGreaterThan(0);

    console.log('✅ Content library retrieved');
    console.log('   Content items:', data.content.length);
  });

  test('16. Verify cleared-for-release updated', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects/${projectId}/cleared-for-release`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.cleared).toBeDefined();

    console.log('✅ Final cleared-for-release check');
    console.log('   Cleared:', data.cleared);
    console.log('   Missing requirements:', data.reasons.length);
  });
});
