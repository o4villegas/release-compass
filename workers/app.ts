import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import projectsRoutes from "./routes/projects";
import contentRoutes from "./routes/content";
import milestonesRoutes from "./routes/milestones";
import filesRoutes from "./routes/files";
import budgetRoutes from "./routes/budget";
import teasersRoutes from "./routes/teasers"; // UI: "Social" feature
import actionsRoutes from "./routes/actions";
import calendarRoutes from "./routes/calendar";

const app = new Hono();

// Health check endpoint
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API routes
const api = new Hono();
api.route("/", projectsRoutes);
api.route("/", contentRoutes);
api.route("/", milestonesRoutes);
api.route("/", filesRoutes); // For /api/projects/:projectId/files and /api/files/:fileId routes
api.route("/budget-items", budgetRoutes);
api.route("/", budgetRoutes); // For /api/projects/:projectId/budget routes
api.route("/teasers", teasersRoutes);
api.route("/", teasersRoutes); // For /api/projects/:projectId/teasers routes
api.route("/", actionsRoutes); // For /api/projects/:projectId/actions routes
api.route("/", calendarRoutes); // For /api/projects/:projectId/calendar and /api/calendar/schedule routes
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
