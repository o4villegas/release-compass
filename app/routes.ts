import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("create-project", "routes/create-project.tsx"),
  route("test-direct-db", "routes/test-direct-db.tsx"),
  route("test-import-handler", "routes/test-import-handler.tsx"),
  route("test-error-handling", "routes/test-error-handling.tsx"),
  route("project/:id", "routes/project.$id.tsx"),
] satisfies RouteConfig;
