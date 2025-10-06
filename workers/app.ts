import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import projectsRoutes from "./routes/projects";
import contentRoutes from "./routes/content";
import milestonesRoutes from "./routes/milestones";

const app = new Hono();

// API routes
app.route("/api", projectsRoutes);
app.route("/api", contentRoutes);
app.route("/api", milestonesRoutes);

// React Router catch-all (must be last)
app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

export default app;
