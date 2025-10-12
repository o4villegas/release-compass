import type { Route } from "./+types/project.$id.budget";
import { useLoaderData, Link, useRevalidator } from 'react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { BackButton } from '~/components/BackButton';
import { BudgetPieChart } from '~/components/BudgetPieChart';
import { AlertCircle, CheckCircle, Upload, Receipt } from 'lucide-react';

type BudgetCategory = 'production' | 'marketing' | 'content_creation' | 'distribution' | 'admin' | 'contingency';

interface BudgetItem {
  id: string;
  category: BudgetCategory;
  description: string;
  amount: number;
  receipt_file: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface CategoryBreakdown {
  spent: number;
  count: number;
  percentage: number;
  recommended_amount: number;
  recommended_percentage: number;
  status: 'under' | 'on-track' | 'warning' | 'critical';
}

interface BudgetAlert {
  type: string;
  severity: 'warning' | 'critical';
  category?: string;
  message: string;
  details: any;
}

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  production: 'Production',
  marketing: 'Marketing',
  content_creation: 'Content Creation',
  distribution: 'Distribution',
  admin: 'Admin',
  contingency: 'Contingency',
};

const CATEGORY_COLORS: Record<string, string> = {
  'under': 'bg-gray-200',
  'on-track': 'bg-green-500',
  'warning': 'bg-yellow-500',
  'critical': 'bg-red-500',
};

export async function loader({ params, context }: Route.LoaderArgs) {
  // Use direct DB access instead of HTTP fetch to avoid SSR issues
  const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

  // Import handler functions
  const { getProjectDetails } = await import("../../workers/api-handlers/projects");
  const { getProjectBudget, getBudgetAlerts } = await import("../../workers/api-handlers/budget");

  const projectData = await getProjectDetails(env.env.DB, params.id);
  if (!projectData) {
    throw new Response("Project not found", { status: 404 });
  }

  const budgetData = await getProjectBudget(env.env.DB, params.id);
  if (!budgetData) {
    throw new Response("Budget not found", { status: 404 });
  }

  const alertsData = await getBudgetAlerts(env.env.DB, params.id);
  if (!alertsData) {
    throw new Response("Budget alerts not found", { status: 404 });
  }

  return {
    project: projectData.project,
    budget: budgetData,
    alerts: alertsData.alerts as BudgetAlert[],
    hasAlerts: alertsData.has_critical || alertsData.has_warnings,
  };
}

export default function ProjectBudget() {
  const { project, budget, alerts, hasAlerts } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  const [category, setCategory] = useState<BudgetCategory>('production');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadedReceiptKey, setUploadedReceiptKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userUuid = typeof window !== 'undefined' ? localStorage.getItem('user_uuid') || crypto.randomUUID() : '';
  if (typeof window !== 'undefined' && !localStorage.getItem('user_uuid')) {
    localStorage.setItem('user_uuid', userUuid);
  }

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReceiptFile(null);
      setUploadedReceiptKey(null);
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Receipt file must be under 10MB');
      return;
    }

    setReceiptFile(file);
    setUploadingReceipt(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', project.id || '');
      formData.append('file_type', 'receipts');
      formData.append('user_uuid', userUuid);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'Failed to upload receipt');
      }

      const data = await response.json() as { file: { storage_key: string } };
      setUploadedReceiptKey(data.file.storage_key);
      setSuccess('Receipt uploaded successfully');
    } catch (err: any) {
      setError(err.message);
      setReceiptFile(null);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!uploadedReceiptKey) {
      setError('Please upload a receipt before submitting');
      return;
    }

    if (!description.trim() || !amount) {
      setError('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/budget-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          category,
          description: description.trim(),
          amount: amountNum,
          receipt_file: uploadedReceiptKey,
          user_uuid: userUuid,
        }),
      });

      const data = await response.json() as {
        code?: string;
        userMessage?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        if (data.code === 'RECEIPT_REQUIRED') {
          throw new Error(data.userMessage || data.message);
        }
        throw new Error(data.error || 'Failed to create budget item');
      }

      setSuccess('Budget item created successfully');
      setDescription('');
      setAmount('');
      setReceiptFile(null);
      setUploadedReceiptKey(null);

      // Revalidate to refresh budget data
      revalidator.revalidate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const categoryData = Object.entries(budget.by_category) as [BudgetCategory, CategoryBreakdown][];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <BackButton to={`/project/${project.id}`} label="Back to Project" />
      </div>

      <div className="mb-6">
        <h1 className="text-4xl font-bold">{project.release_title}</h1>
        <p className="text-muted-foreground">Budget Management</p>
      </div>

      {/* Budget Alerts */}
      {hasAlerts && (
        <Alert className="mb-6 border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Budget Alerts:</strong> {alerts.length} alert{alerts.length > 1 ? 's' : ''} require attention
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Overview */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.total_budget)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.total_spent)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {budget.percentage_spent.toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.remaining)}</div>
            <Progress value={100 - budget.percentage_spent} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Budget Health</CardTitle>
          </CardHeader>
          <CardContent>
            {budget.percentage_spent > 90 ? (
              <Badge variant="destructive">Critical</Badge>
            ) : budget.percentage_spent > 75 ? (
              <Badge className="bg-yellow-500">Warning</Badge>
            ) : (
              <Badge className="bg-green-500">On Track</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Pie Chart */}
      <div className="mb-6">
        <BudgetPieChart
          categoryData={budget.by_category}
          totalBudget={budget.total_budget}
          totalSpent={budget.total_spent}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add Budget Item Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Budget Item</CardTitle>
            <CardDescription>
              All expenses require a receipt upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Category + Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as BudgetCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Description (full width) */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Studio time, social media ads"
                  required
                />
              </div>

              {/* Row 3: Receipt (full width) */}
              <div>
                <Label htmlFor="receipt">Receipt (Required)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="receipt"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleReceiptUpload}
                    disabled={uploadingReceipt}
                  />
                  {uploadedReceiptKey && (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, or PNG - Max 10MB
                </p>
                {uploadingReceipt && (
                  <p className="text-xs text-blue-600 mt-1">Uploading receipt...</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-500">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full glow-hover-sm"
                disabled={!uploadedReceiptKey || submitting || uploadingReceipt}
              >
                {submitting ? 'Adding...' : 'Add Budget Item'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Category Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Allocation</CardTitle>
            <CardDescription>
              Spending by category vs. recommended allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.map(([cat, data]) => (
                <div key={cat}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          data.status === 'critical'
                            ? 'border-red-500 text-red-700'
                            : data.status === 'warning'
                            ? 'border-yellow-500 text-yellow-700'
                            : data.status === 'on-track'
                            ? 'border-green-500 text-green-700'
                            : 'border-gray-300 text-gray-600'
                        }`}
                      >
                        {data.status === 'under' ? 'Under Budget' : data.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(data.spent)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>
                      {data.percentage.toFixed(1)}% actual vs {data.recommended_percentage}% recommended
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>Target: {formatCurrency(data.recommended_amount)}</span>
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute h-full ${CATEGORY_COLORS[data.status]} transition-all`}
                      style={{ width: `${Math.min((data.spent / data.recommended_amount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts Detail */}
      {alerts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Budget Alerts</CardTitle>
            <CardDescription>
              Alerts requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <Alert
                  key={idx}
                  variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                  className={alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' : ''}
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{alert.category ? CATEGORY_LABELS[alert.category as BudgetCategory] : 'Budget'}:</strong>{' '}
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
