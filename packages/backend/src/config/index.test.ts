import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { loadConfig } from "./index";

describe("Configuration Loading", () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Save original environment
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test("loads valid configuration from environment", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";
    process.env.HONO_BACKEND_PORT = "3001";
    process.env.NODE_ENV = "test";

    const config = loadConfig();

    expect(config.database.url).toBe("postgresql://localhost:5432/test");
    expect(config.anthropic.apiKey).toBe("sk-ant-test123");
    expect(config.server.port).toBe(3001);
    expect(config.server.env).toBe("test");
  });

  test("uses default values when optional vars missing", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";
    // HONO_BACKEND_PORT not set - should default to 3001
    delete process.env.HONO_BACKEND_PORT;
    delete process.env.NODE_ENV;

    const config = loadConfig();

    expect(config.server.port).toBe(3001);
    expect(config.server.env).toBe("development"); // default
  });

  test("throws error when required DATABASE_URL missing", () => {
    delete process.env.DATABASE_URL;
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";

    expect(() => loadConfig()).toThrow();
  });

  test("allows configuration with only ANTHROPIC_API_KEY", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";
    delete process.env.OPENAI_API_KEY;

    const config = loadConfig();

    expect(config.anthropic.apiKey).toBe("sk-ant-test123");
    expect(config.openai.apiKey).toBeUndefined();
  });

  test("allows configuration with only OPENAI_API_KEY", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = "sk-openai-test123";

    const config = loadConfig();

    expect(config.anthropic.apiKey).toBeUndefined();
    expect(config.openai.apiKey).toBe("sk-openai-test123");
  });

  test("allows configuration with both API keys", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";
    process.env.OPENAI_API_KEY = "sk-openai-test123";

    const config = loadConfig();

    expect(config.anthropic.apiKey).toBe("sk-ant-test123");
    expect(config.openai.apiKey).toBe("sk-openai-test123");
  });

  test("parses port as number", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";
    process.env.HONO_BACKEND_PORT = "8080";

    const config = loadConfig();

    expect(typeof config.server.port).toBe("number");
    expect(config.server.port).toBe(8080);
  });

  test("accepts valid environment values", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";
    process.env.NODE_ENV = "production";

    const config = loadConfig();

    expect(config.server.env).toBe("production");
  });

  test("rejects invalid environment values", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";
    process.env.NODE_ENV = "invalid";

    expect(() => loadConfig()).toThrow();
  });
});
