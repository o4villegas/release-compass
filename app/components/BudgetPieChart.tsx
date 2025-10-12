import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

type BudgetCategory = 'production' | 'marketing' | 'content_creation' | 'distribution' | 'admin' | 'contingency';

interface CategoryBreakdown {
  spent: number;
  count: number;
  percentage: number;
  recommended_amount: number;
  recommended_percentage: number;
  status: 'under' | 'on-track' | 'warning' | 'critical';
}

interface BudgetPieChartProps {
  categoryData: Record<BudgetCategory, CategoryBreakdown>;
  totalBudget: number;
  totalSpent: number;
}

export function BudgetPieChart(props: BudgetPieChartProps) {
  const [ClientComponent, setClientComponent] = useState<any>(null);

  useEffect(() => {
    // Only import on client-side
    import('./BudgetPieChart.client').then(module => {
      setClientComponent(() => module.BudgetPieChartClient);
    });
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Server-side and loading state
  if (!ClientComponent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Distribution</CardTitle>
          <CardDescription>
            Visual breakdown of spending by category • {formatCurrency(props.totalSpent)} of {formatCurrency(props.totalBudget)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="text-sm text-muted-foreground">Loading chart...</div>
        </CardContent>
      </Card>
    );
  }

  // Client-side rendering
  return <ClientComponent {...props} />;
}
