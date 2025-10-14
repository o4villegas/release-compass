import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Music,
  FolderOpen,
  Calendar,
  DollarSign,
  Megaphone,
  Upload,
  ChevronLeft,
  ChevronRight,
  Disc3
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '~/lib/utils';

interface StudioSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  activePattern?: RegExp;
}

/**
 * Studio Sidebar Navigation
 * DAW-inspired collapsible sidebar with music-centric language
 */
export function StudioSidebar({ collapsed, onToggle }: StudioSidebarProps) {
  const location = useLocation();

  // Extract project ID from URL if present
  const projectId = location.pathname.match(/\/project\/([^\/]+)/)?.[1];

  const navigationItems: NavItem[] = projectId ? [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: `/project/${projectId}`,
      activePattern: new RegExp(`^/project/${projectId}$`)
    },
    {
      label: 'Content Library',
      icon: FolderOpen,
      path: `/project/${projectId}/content`,
      activePattern: new RegExp(`/project/${projectId}/content`)
    },
    {
      label: 'Calendar',
      icon: Calendar,
      path: `/project/${projectId}/calendar`,
      activePattern: new RegExp(`/project/${projectId}/calendar`)
    },
    {
      label: 'Budget',
      icon: DollarSign,
      path: `/project/${projectId}/budget`,
      activePattern: new RegExp(`/project/${projectId}/budget`)
    },
    {
      label: 'Master Upload',
      icon: Upload,
      path: `/project/${projectId}/master`,
      activePattern: new RegExp(`/project/${projectId}/master`)
    },
    {
      label: 'Production Files',
      icon: Music,
      path: `/project/${projectId}/files`,
      activePattern: new RegExp(`/project/${projectId}/files`)
    },
    {
      label: 'Teasers',
      icon: Megaphone,
      path: `/project/${projectId}/teasers`,
      activePattern: new RegExp(`/project/${projectId}/teasers`)
    },
  ] : [
    {
      label: 'Projects',
      icon: Disc3,
      path: '/projects',
      activePattern: /^\/projects$/
    }
  ];

  const isActive = (item: NavItem) => {
    if (item.activePattern) {
      return item.activePattern.test(location.pathname);
    }
    return location.pathname === item.path;
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-studio-border bg-studio-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-studio-border px-4">
        {!collapsed && (
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/releasecompass-logo.png"
              alt="Release Compass"
              className="h-6 w-auto object-contain"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 hover:bg-studio-hover"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                "hover:bg-studio-hover hover:text-studio-foreground",
                active
                  ? "bg-studio-active text-studio-active-foreground shadow-sm"
                  : "text-studio-muted-foreground",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-studio-accent")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Back to Projects */}
      {projectId && (
        <div className="border-t border-studio-border p-2">
          <Link
            to="/projects"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              "hover:bg-studio-hover hover:text-studio-foreground text-studio-muted-foreground",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "All Projects" : undefined}
          >
            <Disc3 className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>All Projects</span>}
          </Link>
        </div>
      )}
    </aside>
  );
}
