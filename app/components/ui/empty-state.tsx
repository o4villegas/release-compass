import { Button } from "./button";
import { Link } from "react-router";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    to: string;
  };
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon with neon glow */}
      {icon && (
        <div className="mb-6 relative">
          <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center glow-md">
            {typeof icon === "string" ? (
              <span className="text-5xl">{icon}</span>
            ) : (
              <div className="text-primary/60">{icon}</div>
            )}
          </div>
          {/* Animated scan line effect */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
        </div>
      )}

      <h3 className="text-xl font-semibold mb-2 text-primary">{title}</h3>

      <p className="text-muted-foreground max-w-md mb-6">{description}</p>

      {action && (
        <Button asChild variant="neon" className="glow-hover-md">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
