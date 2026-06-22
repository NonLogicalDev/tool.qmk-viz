import { useEffect, type ReactNode } from "react";
import {
  Navigate,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter
} from "@tanstack/react-router";
import { App } from "./App";
import { EditorPage } from "./pages/EditorPage";
import { ExportPage } from "./pages/ExportPage";
import { ProjectPage } from "./pages/ProjectPage";
import { useAppStore } from "./stores/appStore";
import type { AppPage } from "./lib/appNavigation";

function PageRoute({ children, page }: { children: ReactNode; page: AppPage }) {
  const setActivePage = useAppStore((state) => state.setActivePage);

  useEffect(() => {
    setActivePage(page);
  }, [page, setActivePage]);

  return children;
}

const rootRoute = createRootRoute({
  component: App
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/layout" replace />
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/project",
  component: () => (
    <PageRoute page="projects">
      <ProjectPage />
    </PageRoute>
  )
});

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/layout",
  component: () => (
    <PageRoute page="editor">
      <EditorPage />
    </PageRoute>
  )
});

const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/export",
  component: () => (
    <PageRoute page="export">
      <ExportPage />
    </PageRoute>
  )
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute,
  layoutRoute,
  exportRoute
]);

export const router = createRouter({
  history: createHashHistory(),
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
