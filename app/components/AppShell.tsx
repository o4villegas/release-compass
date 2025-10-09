import { useLocation, Link } from 'react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { Separator } from '~/components/ui/separator';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const breadcrumbs = generateBreadcrumbs(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-primary text-xl">Release Compass</span>
            </Link>
          </div>

          {/* Breadcrumbs */}
          <div className="flex flex-1 items-center justify-between">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={crumb.path}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-screen-2xl py-6">
        {children}
      </main>
    </div>
  );
}

interface Breadcrumb {
  label: string;
  path: string;
}

function generateBreadcrumbs(pathname: string): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [{ label: 'Home', path: '/' }];

  // Parse pathname segments
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return breadcrumbs;
  }

  // Build breadcrumb path progressively
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip UUID segments (they're not useful in breadcrumbs)
    if (isUuid(segment)) {
      continue;
    }

    // Determine label based on segment
    let label = segment;

    if (segment === 'project') {
      label = 'Project';
      // If next segment is UUID, we'll show project name (from context)
      if (i + 1 < segments.length && isUuid(segments[i + 1])) {
        currentPath += `/${segments[i + 1]}`;
        i++; // Skip UUID in next iteration
      }
    } else if (segment === 'milestone') {
      label = 'Milestone';
      if (i + 1 < segments.length && isUuid(segments[i + 1])) {
        currentPath += `/${segments[i + 1]}`;
        i++; // Skip UUID in next iteration
      }
    } else if (segment === 'budget') {
      label = 'Budget';
    } else if (segment === 'content') {
      label = 'Content Library';
    } else if (segment === 'files') {
      label = 'Production Files';
    } else if (segment === 'master') {
      label = 'Master Upload';
    } else if (segment === 'teasers') {
      label = 'Teasers';
    } else {
      // Capitalize first letter
      label = segment.charAt(0).toUpperCase() + segment.slice(1);
    }

    breadcrumbs.push({ label, path: currentPath });
  }

  return breadcrumbs;
}

function isUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
