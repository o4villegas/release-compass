import { useState } from 'react';
import { StudioSidebar } from './StudioSidebar';
import { InspectorPanel } from './InspectorPanel';

interface StudioWorkspaceProps {
  children: React.ReactNode;
  inspector?: React.ReactNode;
  showInspector?: boolean;
}

/**
 * Studio Workspace Layout
 * Three-panel DAW-inspired layout: Sidebar | Canvas | Inspector
 *
 * Inspired by: Ableton Live, FL Studio, Logic Pro
 * Design Philosophy: Non-linear creative workspace, not linear task management
 */
export function StudioWorkspace({ children, inspector, showInspector = false }: StudioWorkspaceProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Persist sidebar state in localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studio-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('studio-sidebar-collapsed', String(newState));
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-studio-background">
      {/* Left Sidebar - Navigation & Context */}
      <StudioSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Center Canvas - Main Content */}
      <main className="flex-1 overflow-y-auto bg-studio-canvas">
        <div className="container max-w-screen-2xl py-6">
          {children}
        </div>
      </main>

      {/* Right Inspector - Context Details (conditional) */}
      {showInspector && inspector && (
        <InspectorPanel>
          {inspector}
        </InspectorPanel>
      )}
    </div>
  );
}
