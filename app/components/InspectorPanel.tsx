import { cn } from '~/lib/utils';

interface InspectorPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Inspector Panel (Right Sidebar)
 * Context-sensitive details panel - appears when needed
 * Inspired by: Logic Pro Inspector, Ableton Device View
 */
export function InspectorPanel({ children, className }: InspectorPanelProps) {
  return (
    <aside
      className={cn(
        "w-80 border-l border-studio-border bg-studio-inspector overflow-y-auto",
        className
      )}
    >
      <div className="p-4">
        {children}
      </div>
    </aside>
  );
}
