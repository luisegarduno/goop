import { z } from "zod";
import { config } from "dotenv";

config({ path: "../../.env" });

const configSchema = z.object({
  database: z.object({
    url: z.string().url(),
  }),
  anthropic: z.object({
    apiKey: z.string().optional(),
  }),
  openai: z.object({
    apiKey: z.string().optional(),
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
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
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
    console.log("  Anthropic API Key:", config.anthropic.apiKey.substring(0, 10) + "...");
    if (config.openai.apiKey) {
      console.log("  OpenAI API Key:", config.openai.apiKey.substring(0, 10) + "...");
    } else {
      console.log("  OpenAI API Key: (not configured)");
    }
    console.log("  Server Port:", config.server.port);
    console.log("  Environment:", config.server.env);
  } catch (error) {
    console.error("✗ Config validation failed:");
    console.error(error);
    process.exit(1);
  }
}
