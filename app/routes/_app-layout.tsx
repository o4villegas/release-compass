import type { Route } from "./+types/_app-layout";
import { Outlet } from 'react-router';
import { AppShell } from '~/components/AppShell';

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
