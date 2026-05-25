import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./i18n";
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
import { OrganizationPage } from "./pages/OrganizationPage";
import { ProjectPage } from "./pages/ProjectPage";
import { SubprojectPage } from "./pages/SubprojectPage";
import { CampaignPage } from "./pages/CampaignPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ConversationPage } from "./pages/ConversationPage";
import { WebhooksPage } from "./pages/WebhooksPage";
import { BillingPage } from "./pages/BillingPage";
import { SchedulerPage } from "./pages/SchedulerPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Navigate to="/orgs" replace /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/conversations/:convId", element: <ConversationPage /> },
      { path: "/campaigns/:campaignId", element: <CampaignPage /> },
      { path: "/orgs/:orgId/webhooks", element: <WebhooksPage /> },
      { path: "/orgs/:orgId/billing", element: <BillingPage /> },
      { path: "/orgs/:orgId/scheduler", element: <SchedulerPage /> },
      { path: "/orgs", element: <OrganizationsPage /> },
      { path: "/orgs/:orgId", element: <OrganizationPage /> },
      { path: "/orgs/:orgId/projects/:projectId", element: <ProjectPage /> },
      {
        path: "/orgs/:orgId/projects/:projectId/subprojects/:subprojectId",
        element: <SubprojectPage />,
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
