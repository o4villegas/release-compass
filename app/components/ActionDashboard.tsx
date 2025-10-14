import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Alert } from '~/components/ui/alert';
import { Link } from 'react-router';
import { AlertTriangle, Clock, X, AlertCircle, CheckCircle, Circle } from 'lucide-react';

interface ActionItem {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_url: string;
  action_label: string;
  dismissible: boolean;
  metadata: Record<string, any>;
}

interface ActionDashboardProps {
  projectId: string;
  sticky?: boolean;
}

export function ActionDashboard({ projectId, sticky = false }: ActionDashboardProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [reminders, setReminders] = useState<Map<string, number>>(new Map());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Load dismissed actions from localStorage
    const stored = localStorage.getItem(`actions-dismissed-${projectId}`);
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Failed to parse dismissed actions:', e);
      }
    }

    // Load reminders from localStorage
    const storedReminders = localStorage.getItem(`actions-reminders-${projectId}`);
    if (storedReminders) {
      try {
        const parsed = JSON.parse(storedReminders);
        setReminders(new Map(Object.entries(parsed).map(([k, v]) => [k, v as number])));
      } catch (e) {
        console.error('Failed to parse reminders:', e);
      }
    }
  }, [projectId]);

  useEffect(() => {
    // Fetch actions from API
    fetch(`/api/projects/${projectId}/actions`)
      .then(res => res.json())
      .then(data => {
        const typedData = data as { actions?: ActionItem[]; count?: number };
        setActions(typedData.actions || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching actions:', err);
        setLoading(false);
      });
  }, [projectId]);

  const handleDismiss = (actionId: string) => {
    const newDismissed = new Set([...dismissed, actionId]);
    setDismissed(newDismissed);
    localStorage.setItem(
      `actions-dismissed-${projectId}`,
      JSON.stringify([...newDismissed])
    );
  };

  const handleRemindTomorrow = (actionId: string) => {
    const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
    const newReminders = new Map(reminders);
    newReminders.set(actionId, tomorrow);
    setReminders(newReminders);
    localStorage.setItem(
      `actions-reminders-${projectId}`,
      JSON.stringify(Object.fromEntries(newReminders))
    );
    handleDismiss(actionId);
  };

  // Filter visible actions
  const visibleActions = actions.filter(action => {
    if (dismissed.has(action.id)) {
      // Check if reminder expired
      const reminderTime = reminders.get(action.id);
      if (reminderTime && Date.now() >= reminderTime) {
        // Clear reminder and show again
        const newReminders = new Map(reminders);
        newReminders.delete(action.id);
        setReminders(newReminders);
        const newDismissed = new Set(dismissed);
        newDismissed.delete(action.id);
        setDismissed(newDismissed);
        return true;
      }
      return false;
    }
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-5 w-5 text-primary" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card className="border-border bg-card/50 backdrop-blur">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <span className="text-muted-foreground ml-2">Loading actions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleActions.length === 0) return null;

  if (sticky) {
    // Compact top bar
    return (
      <div className="sticky top-0 z-50 bg-destructive/10 border-b border-destructive/20 px-6 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span className="font-semibold">
              {visibleActions.length} action{visibleActions.length !== 1 ? 's' : ''} required
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="#actions">View Actions</a>
          </Button>
        </div>
      </div>
    );
  }

  // Compact collapsible view
  return (
    <div id="actions" className="mb-6">
      {/* Compact header - collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full group"
      >
        <div className={`
          relative overflow-hidden rounded-lg border transition-all duration-200
          ${isExpanded
            ? 'bg-red-950/20 border-red-500/40 shadow-lg shadow-red-500/10'
            : 'bg-card/50 border-border hover:border-red-500/30 hover:bg-red-950/10'
          }
        `}>
          <div className="relative z-10 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full transition-all
                ${isExpanded
                  ? 'bg-red-500/30 border-2 border-red-500/60'
                  : 'bg-red-500/10 border border-red-500/30 group-hover:bg-red-500/20'
                }
              `}>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {visibleActions.length} Action{visibleActions.length !== 1 ? 's' : ''} Required
                  </h3>
                  <Badge variant="destructive" className="text-xs px-2 py-0.5">
                    {visibleActions.filter(a => a.severity === 'high').length} High
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isExpanded ? 'Click to collapse' : 'Click to view details'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`
                px-3 py-1 font-bold transition-all
                ${isExpanded
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-red-500/20 text-red-400 group-hover:bg-red-500/30'
                }
              `}>
                {visibleActions.length}
              </Badge>
              <svg
                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* Collapsible action cards section */}
      {isExpanded && (
        <div className="space-y-3 mt-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          {visibleActions.map((action, index) => (
          <Card
            key={action.id}
            className={`
              border-l-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5
              ${
                action.severity === 'high'
                  ? 'border-l-red-500 bg-gradient-to-r from-red-950/30 to-card hover:shadow-red-500/20'
                  : action.severity === 'medium'
                  ? 'border-l-yellow-500 bg-gradient-to-r from-yellow-950/30 to-card hover:shadow-yellow-500/20'
                  : 'border-l-primary bg-gradient-to-r from-primary/10 to-card hover:shadow-primary/20'
              }
            `}
            style={{
              animationDelay: `${index * 50}ms`,
              animation: 'fadeInUp 0.3s ease-out forwards'
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`
                    flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg
                    ${action.severity === 'high' ? 'bg-red-500/20 border-2 border-red-500/50 shadow-red-500/20' :
                      action.severity === 'medium' ? 'bg-yellow-500/20 border-2 border-yellow-500/50 shadow-yellow-500/20' :
                      'bg-primary/20 border-2 border-primary/50 shadow-primary/20'}
                  `}>
                    {getSeverityIcon(action.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold leading-tight mb-1.5 text-foreground">
                      {action.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={getSeverityColor(action.severity)}
                  className="flex-shrink-0 font-semibold shadow-sm"
                >
                  {action.severity.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="shadow-sm hover:shadow-md hover:shadow-primary/30 transition-shadow font-medium"
                >
                  <Link to={action.action_url}>
                    {action.action_label}
                    <span className="ml-1.5">→</span>
                  </Link>
                </Button>
                {action.dismissible && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemindTomorrow(action.id)}
                      className="hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1.5"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Remind Tomorrow
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(action.id)}
                      className="hover:bg-accent transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </Button>
                  </>
                )}
                {!action.dismissible && (
                  <Badge variant="outline" className="ml-2 border-red-500/50 text-red-400 bg-red-950/30 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Required
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}
    </div>
  );
}
