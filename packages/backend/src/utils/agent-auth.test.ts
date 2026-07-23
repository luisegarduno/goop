import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { claudeCodeAuthStatus, codexAuthStatus } from "./agent-auth";

let tempHome: string;
const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["HOME", "CLAUDE_CONFIG_DIR", "CLAUDE_CODE_OAUTH_TOKEN", "CODEX_HOME"];

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];

  // Point everything at an isolated temp home so the real machine's logins
  // don't leak into assertions (os.homedir() honors $HOME on POSIX).
  tempHome = mkdtempSync(join(tmpdir(), "goop-auth-test-"));
  process.env.HOME = tempHome;
  process.env.CLAUDE_CONFIG_DIR = join(tempHome, ".claude");
  process.env.CODEX_HOME = join(tempHome, ".codex");
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  rmSync(tempHome, { recursive: true, force: true });
});

describe("claudeCodeAuthStatus", () => {
  test("unauthenticated with a login hint when nothing is configured", () => {
    const status = claudeCodeAuthStatus();
    expect(status.authType).toBe("subscription");
    expect(status.authenticated).toBe(false);
    expect(status.hint).toContain("/login");
  });

  test("authenticated via CLAUDE_CODE_OAUTH_TOKEN", () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat01-test";
    const status = claudeCodeAuthStatus();
    expect(status.authenticated).toBe(true);
    expect(status.method).toBe("oauth-token");
  });

  test("authenticated via Claude Code credentials file", () => {
    mkdirSync(join(tempHome, ".claude"), { recursive: true });
    writeFileSync(join(tempHome, ".claude", ".credentials.json"), "{}");
    const status = claudeCodeAuthStatus();
    expect(status.authenticated).toBe(true);
    expect(status.method).toBe("claude-cli-login");
  });

  test("authenticated via oauthAccount in ~/.claude.json (Keychain platforms)", () => {
    writeFileSync(
      join(tempHome, ".claude.json"),
      JSON.stringify({ oauthAccount: { emailAddress: "user@example.com" } })
    );
    const status = claudeCodeAuthStatus();
    expect(status.authenticated).toBe(true);
    expect(status.method).toBe("claude-cli-login");
  });
});

describe("codexAuthStatus", () => {
  test("unauthenticated with a login hint when auth.json is missing", () => {
    const status = codexAuthStatus();
    expect(status.authType).toBe("subscription");
    expect(status.authenticated).toBe(false);
    expect(status.hint).toContain("codex login");
  });

  test("authenticated via ChatGPT login tokens", () => {
    mkdirSync(join(tempHome, ".codex"), { recursive: true });
    writeFileSync(
      join(tempHome, ".codex", "auth.json"),
      JSON.stringify({ tokens: { access_token: "abc" } })
    );
    const status = codexAuthStatus();
    expect(status.authenticated).toBe(true);
    expect(status.method).toBe("chatgpt-login");
  });

  test("reports API key auth from codex login --api-key", () => {
    mkdirSync(join(tempHome, ".codex"), { recursive: true });
    writeFileSync(
      join(tempHome, ".codex", "auth.json"),
      JSON.stringify({ OPENAI_API_KEY: "sk-test" })
    );
    const status = codexAuthStatus();
    expect(status.authenticated).toBe(true);
    expect(status.method).toBe("codex-api-key");
  });
});
