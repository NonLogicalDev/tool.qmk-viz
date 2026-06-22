export type AppPage = "editor" | "projects" | "export";

export type AppPageDefinition = {
  id: AppPage;
  label: string;
  description: string;
};

export const appPages: AppPageDefinition[] = [
  { id: "projects", label: "Project", description: "Project library and keyboard model" },
  { id: "editor", label: "Layout", description: "Layouts, keyboard, and key actions" },
  { id: "export", label: "Export", description: "JSON and KLE downloads" }
];

export const appPagePaths: Record<AppPage, "/project" | "/layout" | "/export"> = {
  projects: "/project",
  editor: "/layout",
  export: "/export"
};

export function pathForPage(page: AppPage) {
  return appPagePaths[page];
}

export function pageForPath(pathname: string): AppPage {
  switch (pathname) {
    case "/project":
      return "projects";
    case "/export":
      return "export";
    case "/layout":
    default:
      return "editor";
  }
}
