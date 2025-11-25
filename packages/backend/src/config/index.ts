import { z } from "zod";
import { config } from "dotenv";

config({ path: "../../.env" });

const configSchema = z.object({
  database: z.object({
    url: z.string().url(),
  }),
  anthropic: z.object({
    apiKey: z.string().min(1),
  }),
  server: z.object({
    port: z.coerce.number().default(3001),
    env: z.enum(["development", "production", "test"]).default("development"),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const raw = {
    database: {
      url: process.env.DATABASE_URL,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    server: {
      port: process.env.PORT || 3001,
      env: process.env.NODE_ENV || "development",
    },
  };

  return configSchema.parse(raw);
}

// For testing: run loadConfig when file is executed directly
if (import.meta.main) {
  try {
    const config = loadConfig();
    console.log("✓ Config loaded successfully");
    console.log("  Database URL:", config.database.url);
    console.log("  API Key:", config.anthropic.apiKey.substring(0, 10) + "...");
    console.log("  Server Port:", config.server.port);
    console.log("  Environment:", config.server.env);
  } catch (error) {
    console.error("✗ Config validation failed:");
    console.error(error);
    process.exit(1);
  }
}
