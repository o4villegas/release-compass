import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import projectsRoutes from "./routes/projects";

const app = new Hono();

// API routes
app.route("/api", projectsRoutes);

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
