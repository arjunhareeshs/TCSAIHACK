import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { HelpModal } from './HelpModal';
import FloatingCopilot from '../copilot/FloatingCopilot';
import { apiClient } from '../../shared/api/client';
import { Project } from '../../shared/api/types';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    apiClient.getProjects().then(setProjects);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex' }}>
      {/* Reusable Sidebar with Hover Expand on Logo & Vertically Centralized Icons */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: '72px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Topbar */}
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          projects={projects}
        />

        {/* Page Content Viewport */}
        <main
          style={{
            marginTop: '68px',
            flex: 1,
            padding: '32px 36px',
            backgroundColor: '#FFFFFF',
            maxWidth: '1600px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Floating 3D Boy Copilot Widget at Bottom-Right */}
      <FloatingCopilot />
    </div>
  );
};

export default AppLayout;
