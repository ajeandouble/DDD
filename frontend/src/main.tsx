import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, localStorageColorSchemeManager } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { queryClient } from "./lib/query-client";
import { LoginPage } from "./pages/LoginPage";
import { AppLayout } from "./components/AppLayout";
import { OrganizationsPage } from "./pages/OrganizationsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SubprojectsPage } from "./pages/SubprojectsPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { CampaignPage } from "./pages/CampaignPage";
import { SettingsPage } from "./pages/SettingsPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Navigate to="/orgs" replace /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/orgs", element: <OrganizationsPage /> },
      { path: "/orgs/:orgId", element: <ProjectsPage /> },
      { path: "/orgs/:orgId/projects/:projectId", element: <SubprojectsPage /> },
      {
        path: "/orgs/:orgId/projects/:projectId/subprojects/:subprojectId",
        element: <CampaignsPage />,
      },
      {
        path: "/orgs/:orgId/projects/:projectId/subprojects/:subprojectId/campaigns/:campaignId",
        element: <CampaignPage />,
      },
    ],
  },
]);

const colorSchemeManager = localStorageColorSchemeManager({ key: "ddd-color-scheme" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider colorSchemeManager={colorSchemeManager} defaultColorScheme="auto">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>
);
