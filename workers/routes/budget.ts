import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Budget categories and recommended allocations
const BUDGET_CATEGORIES = ['production', 'marketing', 'distribution', 'admin', 'contingency', 'content_creation'] as const;
type BudgetCategory = typeof BUDGET_CATEGORIES[number];

const RECOMMENDED_ALLOCATIONS: Record<BudgetCategory, number> = {
  production: 0.35,      // 35%
  marketing: 0.30,       // 30%
  content_creation: 0.10, // 10%
  distribution: 0.10,    // 10%
  admin: 0.10,          // 10%
  contingency: 0.05,    // 5%
};

/**
 * POST /api/budget-items
 * Create a new budget item with required receipt
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { project_id, category, description, amount, receipt_file, user_uuid } = body;

    // Validate required fields
    if (!project_id || !category || !description || !amount || !user_uuid) {
      return c.json(
        {
          error: 'Missing required fields',
          required: ['project_id', 'category', 'description', 'amount', 'user_uuid'],
        },
        400
      );
    }

    // Validate category
    if (!BUDGET_CATEGORIES.includes(category as BudgetCategory)) {
      return c.json(
        { error: `Invalid category. Must be one of: ${BUDGET_CATEGORIES.join(', ')}` },
        400
      );
    }

    // CRITICAL: Require receipt file
    if (!receipt_file) {
      return c.json(
        {
          error: 'RECEIPT_REQUIRED',
          code: 'RECEIPT_REQUIRED',
          message: 'Receipt upload required for budget items',
          userMessage: 'Please upload a receipt before submitting this expense',
        },
        422
      );
    }

    // Verify receipt file exists in files table
    const fileExists = await c.env.DB.prepare(`
      SELECT id FROM files WHERE storage_key = ? AND file_type = 'receipts'
    `)
      .bind(receipt_file)
      .first();

    if (!fileExists) {
      return c.json(
        { error: 'Invalid receipt_file. File must be uploaded first with file_type=receipts' },
        400
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      return c.json({ error: 'Amount must be greater than 0' }, 400);
    }

    // Insert budget item
    const itemId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO budget_items (
        id, project_id, category, description, amount, receipt_file, approval_status, created_at, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `)
      .bind(itemId, project_id, category, description, amount, receipt_file, createdAt, user_uuid)
      .run();

    return c.json(
      {
        success: true,
        budget_item: {
          id: itemId,
          project_id,
          category,
          description,
          amount,
          receipt_file,
          approval_status: 'pending',
          created_at: createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error creating budget item:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/projects/:projectId/budget
 * Get enhanced budget summary with allocations and percentages
 */
app.get('/projects/:projectId/budget', async (c) => {
  try {
    const { projectId } = c.req.param();

    // Use extracted handler function
    const { getProjectBudget } = await import('../api-handlers/budget');
    const data = await getProjectBudget(c.env.DB, projectId);

    if (!data) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(data);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/projects/:projectId/budget/alerts
 * Check budget health and generate alerts
 */
app.get('/projects/:projectId/budget/alerts', async (c) => {
  try {
    const { projectId } = c.req.param();

    // Use extracted handler function
    const { getBudgetAlerts } = await import('../api-handlers/budget');
    const data = await getBudgetAlerts(c.env.DB, projectId);

    if (!data) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(data);
  } catch (error) {
    console.error('Error checking budget alerts:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
