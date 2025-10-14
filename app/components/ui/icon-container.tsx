import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "~/lib/utils"

export interface IconContainerProps {
  icon: LucideIcon
  variant?: "default" | "primary" | "secondary"
  size?: "sm" | "md" | "lg"
  glow?: boolean
  className?: string
}

export function IconContainer({
  icon: Icon,
  variant = "default",
  size = "md",
  glow = false,
  className,
}: IconContainerProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-md",
        {
          "w-8 h-8": size === "sm",
          "w-10 h-10": size === "md",
          "w-12 h-12": size === "lg",
        },
        {
          "bg-primary/10 text-primary": variant === "primary",
          "bg-secondary/10 text-secondary": variant === "secondary",
          "bg-muted text-muted-foreground": variant === "default",
        },
        glow && "glow-sm",
        className
      )}
    >
      <Icon className="w-1/2 h-1/2" />
    </div>
  )
}
