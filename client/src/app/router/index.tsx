import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import DashboardPage from '../../pages/dashboard';
import ProjectsPage from '../../pages/projects';
import NewProjectPage from '../../pages/projects/NewProjectPage';
import ProjectOverviewPage from '../../pages/projects/ProjectOverviewPage';
import ReportsPage from '../../pages/reports';
import SettingsPage from '../../pages/settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'projects/new',
        element: <NewProjectPage />,
      },
      {
        path: 'projects/:id',
        element: <ProjectOverviewPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
