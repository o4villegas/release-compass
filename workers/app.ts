import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import projectsRoutes from "./routes/projects";
import contentRoutes from "./routes/content";
import milestonesRoutes from "./routes/milestones";

const app = new Hono();

// API routes
const api = new Hono();
api.route("/", projectsRoutes);
api.route("/", contentRoutes);
api.route("/", milestonesRoutes);
app.route("/api", api);

// React Router handler for all non-API routes
// Using notFound ensures API routes are tried first
app.notFound((c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

export default app;
