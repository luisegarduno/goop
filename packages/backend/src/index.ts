import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { loadConfig } from "./config/index";
import { apiRoutes } from "./api/routes";

const config = loadConfig();
const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// API routes
app.route("/api", apiRoutes);

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: err.message }, 500);
});

console.log(`Server starting on port ${config.server.port}...`);

export default {
  port: config.server.port,
  fetch: app.fetch,
};
