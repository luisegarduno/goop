import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * Auth status for subscription-backed agent providers. These providers never
 * take an API key; they piggyback on the official CLI logins (Claude Code,
 * Codex) so usage is billed to the user's Claude Pro/Max or ChatGPT plan.
 */
export interface AgentAuthStatus {
  authType: "subscription";
  authenticated: boolean;
  /** How credentials were found (null when unauthenticated). */
  method: string | null;
  /** Human-readable summary for the UI. */
  detail: string;
  /** Shown when unauthenticated: how to log in. */
  hint?: string;
}

function readJsonSafe(path: string): Record<string, unknown> | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

// Prefer $HOME so the location can be overridden (tests, containers);
// os.homedir() does not always track env changes.
function home(): string {
  return process.env.HOME || homedir();
}

export function claudeCodeAuthStatus(): AgentAuthStatus {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return {
      authType: "subscription",
      authenticated: true,
      method: "oauth-token",
      detail: "Using CLAUDE_CODE_OAUTH_TOKEN from the environment.",
    };
  }

  const configDir = process.env.CLAUDE_CONFIG_DIR || join(home(), ".claude");
  const hasCredentialsFile = existsSync(join(configDir, ".credentials.json"));
  // macOS stores credentials in the Keychain; ~/.claude.json still records the
  // logged-in account, so check it as a cross-platform fallback signal.
  const claudeJson = readJsonSafe(join(home(), ".claude.json"));
  const hasOauthAccount = Boolean(claudeJson?.oauthAccount);

  if (hasCredentialsFile || hasOauthAccount) {
    return {
      authType: "subscription",
      authenticated: true,
      method: "claude-cli-login",
      detail: "Logged in via Claude Code. Usage is billed to your Claude subscription.",
    };
  }

  return {
    authType: "subscription",
    authenticated: false,
    method: null,
    detail: "Not logged in to Claude Code.",
    hint: "Run `claude` in a terminal and use /login to sign in with your Claude Pro/Max account (or set CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token`).",
  };
}

export function codexAuthStatus(): AgentAuthStatus {
  const codexHome = process.env.CODEX_HOME || join(home(), ".codex");
  const auth = readJsonSafe(join(codexHome, "auth.json"));

  if (auth && "tokens" in auth && auth.tokens) {
    return {
      authType: "subscription",
      authenticated: true,
      method: "chatgpt-login",
      detail: "Logged in via Codex. Usage is billed to your ChatGPT plan.",
    };
  }

  if (auth && typeof auth.OPENAI_API_KEY === "string" && auth.OPENAI_API_KEY) {
    return {
      authType: "subscription",
      authenticated: true,
      method: "codex-api-key",
      detail: "Codex is authenticated with an API key from `codex login --api-key` (API billing, not a ChatGPT plan).",
    };
  }

  return {
    authType: "subscription",
    authenticated: false,
    method: null,
    detail: "Not logged in to Codex.",
    hint: "Run `codex login` (the CLI ships with goop: `bunx codex login`) and sign in with your ChatGPT account.",
  };
}
