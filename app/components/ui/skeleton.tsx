import { cn } from "~/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "neon"
}

function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md",
        {
          "bg-primary/10": variant === "default",
          "bg-primary/20 glow-sm": variant === "neon",
        },
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
