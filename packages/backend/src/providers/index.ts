import { Provider } from "./base";
import { AnthropicProvider, ANTHROPIC_MODELS } from "./anthropic";
import { OpenAIProvider, OPENAI_MODELS } from "./openai";
import { loadConfig } from "../config/index";

export type ProviderName = "anthropic" | "openai";

export interface ProviderInfo {
  name: ProviderName;
  displayName: string;
  models: readonly string[];
}

export const AVAILABLE_PROVIDERS: ProviderInfo[] = [
  {
    name: "anthropic",
    displayName: "Anthropic Claude",
    models: ANTHROPIC_MODELS,
  },
  {
    name: "openai",
    displayName: "OpenAI GPT",
    models: OPENAI_MODELS, // Static list, will be enhanced with dynamic fetching
  },
];

export function createProvider(
  providerName: ProviderName,
  model: string
): Provider {
  switch (providerName) {
    case "anthropic":
      return new AnthropicProvider(model);
    case "openai":
      return new OpenAIProvider(model);
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
export { ANTHROPIC_MODELS, OPENAI_MODELS };
