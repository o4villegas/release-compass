import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("create-project", "routes/create-project.tsx"),
  route("project/:id", "routes/project.$id.tsx"),
  route("project/:id/budget", "routes/project.$id.budget.tsx"),
  route("project/:id/content", "routes/project.$id.content.tsx"),
  route("project/:id/files", "routes/project.$id.files.tsx"),
  route("project/:id/master", "routes/project.$id.master.tsx"),
  route("project/:id/teasers", "routes/project.$id.teasers.tsx"),
  route("milestone/:id", "routes/milestone.$id.tsx"),
  route("test-direct-db", "routes/test-direct-db.tsx"),
  route("test-import-handler", "routes/test-import-handler.tsx"),
  route("test-error-handling", "routes/test-error-handling.tsx"),
] satisfies RouteConfig;
