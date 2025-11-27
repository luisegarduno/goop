/**
 * Validates an API key for a given provider by making a test request.
 * @param provider - The provider name ("anthropic" or "openai")
 * @param apiKey - The API key to validate
 * @throws Error if the API key is invalid or the provider is unknown
 */
export async function validateProviderApiKey(
  provider: "anthropic" | "openai",
  apiKey: string
): Promise<void> {
  if (provider === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    // Make a minimal request to validate the key
    await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1,
      messages: [{ role: "user", content: "test" }],
    });
  } else if (provider === "openai") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey });

    // Test OpenAI API key by listing models
    await client.models.list();
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}
