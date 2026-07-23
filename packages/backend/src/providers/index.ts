import { Provider } from "./base";
import { AnthropicProvider, ANTHROPIC_MODELS } from "./anthropic";
import { OpenAIProvider, OPENAI_MODELS } from "./openai";
import { ClaudeCodeProvider, CLAUDE_CODE_MODELS } from "./agent/claude-code";
import { CodexProvider, CODEX_MODELS } from "./agent/codex";
import { AgentProvider } from "./agent/types";

export const PROVIDER_NAMES = [
  "anthropic",
  "openai",
  "claude-code",
  "codex",
] as const;

export type ProviderName = (typeof PROVIDER_NAMES)[number];

/** Providers authenticated with an API key (usage-based billing). */
export const API_KEY_PROVIDERS = ["anthropic", "openai"] as const;
export type ApiKeyProviderName = (typeof API_KEY_PROVIDERS)[number];

export type ProviderAuthType = "api_key" | "subscription";

export interface ProviderInfo {
  name: ProviderName;
  displayName: string;
  models: readonly string[];
  authType: ProviderAuthType;
  description: string;
}

export const AVAILABLE_PROVIDERS: ProviderInfo[] = [
  {
    name: "anthropic",
    displayName: "Anthropic Claude (API key)",
    models: ANTHROPIC_MODELS,
    authType: "api_key",
    description: "Claude API with usage-based billing via ANTHROPIC_API_KEY.",
  },
  {
    name: "openai",
    displayName: "OpenAI GPT (API key)",
    models: OPENAI_MODELS, // Static list, will be enhanced with dynamic fetching
    authType: "api_key",
    description: "OpenAI API with usage-based billing via OPENAI_API_KEY.",
  },
  {
    name: "claude-code",
    displayName: "Claude Code (Pro/Max subscription)",
    models: CLAUDE_CODE_MODELS,
    authType: "subscription",
    description:
      "Runs the Claude Code agent with your Claude Pro/Max subscription (log in once with `claude` → /login).",
  },
  {
    name: "codex",
    displayName: "OpenAI Codex (ChatGPT subscription)",
    models: CODEX_MODELS,
    authType: "subscription",
    description:
      "Runs the Codex agent with your ChatGPT Plus/Pro plan (log in once with `codex login`).",
  },
];

export function isApiKeyProvider(name: string): name is ApiKeyProviderName {
  return (API_KEY_PROVIDERS as readonly string[]).includes(name);
}

export function isSubscriptionProvider(name: string): boolean {
  return name === "claude-code" || name === "codex";
}

export function createProvider(
  providerName: ProviderName,
  model: string,
  apiKey?: string
): Provider | AgentProvider {
  switch (providerName) {
    case "anthropic":
      return new AnthropicProvider(model, apiKey);
    case "openai":
      return new OpenAIProvider(model, apiKey);
    case "claude-code":
      return new ClaudeCodeProvider(model);
    case "codex":
      return new CodexProvider(model);
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

export function getProviderInfo(providerName: ProviderName): ProviderInfo {
  const info = AVAILABLE_PROVIDERS.find((p) => p.name === providerName);
  if (!info) {
    throw new Error(`Unknown provider: ${providerName}`);
  }
  return info;
}

// Re-export for convenience
export { ANTHROPIC_MODELS, OPENAI_MODELS, CLAUDE_CODE_MODELS, CODEX_MODELS };
export type { AgentProvider };
export { isAgentProvider } from "./agent/types";
