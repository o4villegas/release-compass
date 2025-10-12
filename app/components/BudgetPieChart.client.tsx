import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';

type BudgetCategory = 'production' | 'marketing' | 'content_creation' | 'distribution' | 'admin' | 'contingency';

interface CategoryBreakdown {
  spent: number;
  count: number;
  percentage: number;
  recommended_amount: number;
  recommended_percentage: number;
  status: 'under' | 'on-track' | 'warning' | 'critical';
}

interface BudgetPieChartClientProps {
  categoryData: Record<BudgetCategory, CategoryBreakdown>;
  totalBudget: number;
  totalSpent: number;
}

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  production: 'Production',
  marketing: 'Marketing',
  content_creation: 'Content Creation',
  distribution: 'Distribution',
  admin: 'Admin',
  contingency: 'Contingency',
};

// Dark theme compatible colors with neon accents
const CATEGORY_CHART_COLORS: Record<BudgetCategory, string> = {
  production: '#8b5cf6',      // Purple
  marketing: '#3b82f6',        // Blue
  content_creation: '#10b981', // Green (primary brand color)
  distribution: '#f59e0b',     // Amber
  admin: '#ef4444',            // Red
  contingency: '#6366f1',      // Indigo
};

export function BudgetPieChartClient({ categoryData, totalBudget, totalSpent }: BudgetPieChartClientProps) {
  // Transform data for Recharts
  const chartData = Object.entries(categoryData).map(([key, data]) => ({
    name: CATEGORY_LABELS[key as BudgetCategory],
    value: data.spent,
    category: key as BudgetCategory,
    percentage: data.percentage,
    recommended: data.recommended_percentage,
    status: data.status,
    recommendedAmount: data.recommended_amount,
  })).filter(item => item.value > 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-1">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Spent: <span className="font-semibold text-foreground">{formatCurrency(data.value)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Actual: <span className="font-semibold text-foreground">{data.percentage.toFixed(1)}%</span> vs{' '}
            Recommended: <span className="font-semibold text-foreground">{data.recommended}%</span>
          </p>
          <Badge
            variant="outline"
            className={`mt-2 text-xs ${
              data.status === 'critical'
                ? 'border-red-500 text-red-400'
                : data.status === 'warning'
                ? 'border-yellow-500 text-yellow-400'
                : data.status === 'on-track'
                ? 'border-green-500 text-green-400'
                : 'border-gray-500 text-gray-400'
            }`}
          >
            {data.status === 'under' ? 'Under Budget' : data.status}
          </Badge>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Distribution</CardTitle>
          <CardDescription>Visual breakdown of spending by category</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No budget items recorded yet</p>
            <p className="text-xs mt-1">Add budget items to see distribution</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Distribution</CardTitle>
        <CardDescription>
          Visual breakdown of spending by category • {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={110}
              fill="#8884d8"
              dataKey="value"
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_CHART_COLORS[entry.category]}
                  stroke="hsl(var(--border))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>

        {/* Status Summary */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-3">
              {Object.entries(categoryData).some(([_, data]) => data.status === 'critical') && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-red-400">Critical</span>
                </div>
              )}
              {Object.entries(categoryData).some(([_, data]) => data.status === 'warning') && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-yellow-400">Warning</span>
                </div>
              )}
              {Object.entries(categoryData).some(([_, data]) => data.status === 'on-track') && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-green-400">On Track</span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {chartData.length} / 6 categories active
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
