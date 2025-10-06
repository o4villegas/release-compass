import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("create-project", "routes/create-project.tsx"),
  route("project/:id", "routes/project.$id.tsx"),
] satisfies RouteConfig;
