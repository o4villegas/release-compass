import type { Route } from "./+types/_app-layout";
import { Outlet } from 'react-router';
import { StudioWorkspace } from '~/components/StudioWorkspace';

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <StudioWorkspace>
      <Outlet />
    </StudioWorkspace>
  );
}
