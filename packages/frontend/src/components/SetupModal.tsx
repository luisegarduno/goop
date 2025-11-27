import { useState, useEffect } from "react";
import { API_BASE, createSession } from "../api/client";

interface SetupModalProps {
  onComplete: (sessionId: string, workingDirectory: string, provider: string, model: string) => void;
}

interface Provider {
  name: string;
  displayName: string;
}

export function SetupModal({ onComplete }: SetupModalProps) {
  const [workingDirectory, setWorkingDirectory] = useState(".");
  const [title, setTitle] = useState("New Conversation");
  const [provider, setProvider] = useState<string>("anthropic");
  const [model, setModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [keyConfiguredInEnv, setKeyConfiguredInEnv] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValidated, setKeyValidated] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  // Fetch available providers on mount
  useEffect(() => {
    fetch(`${API_BASE}/providers`)
      .then((res) => res.json())
      .then((data) => {
        setProviders(data);
        // Set first provider as default if available
        if (data.length > 0) {
          setProvider(data[0].name);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch providers:", error);
      });
  }, []);

  // Fetch models and API key when provider changes
  useEffect(() => {
    if (!provider) return;

    setLoadingModels(true);
    setModel(""); // Reset model when provider changes
    setKeyValidated(false); // Reset validation when provider changes

    // Fetch models
    fetch(`${API_BASE}/providers/${provider}/models`)
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models || []);
        // Set first model as default if available
        if (data.models && data.models.length > 0) {
          setModel(data.models[0]);
        }
        setLoadingModels(false);
      })
      .catch((error) => {
        console.error("Failed to fetch models:", error);
        setLoadingModels(false);
      });

    // Fetch masked API key info from .env (for display only, not used for authentication)
    fetch(`${API_BASE}/providers/${provider}/api-key`)
      .then((res) => res.json())
      .then((data) => {
        setMaskedKey(data.apiKey);
        setKeyConfiguredInEnv(data.isConfigured || false);
        // Don't pre-populate the input field - user must manually enter or validate
      })
      .catch((error) => {
        console.error("Failed to fetch API key info:", error);
        setMaskedKey(null);
        setKeyConfiguredInEnv(false);
      });
  }, [provider]);

  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      setValidationError("Please enter an API key");
      return;
    }

    setValidatingKey(true);
    setValidationError("");

    try {
      const res = await fetch(`${API_BASE}/providers/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = await res.json();

      if (data.valid) {
        setKeyValidated(true);
        setValidationError("");
      } else {
        setKeyValidated(false);
        setValidationError(data.error || "Invalid API key");
      }
    } catch (error) {
      console.error("API key validation error:", error);
      setKeyValidated(false);
      setValidationError("Failed to validate API key");
    } finally {
      setValidatingKey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!workingDirectory.trim() || !title.trim() || !provider || !model) {
      return;
    }

    // If user entered a custom API key, it must be validated
    if (apiKey.trim() && !keyValidated) {
      setValidationError("Please validate your API key first");
      return;
    }

    // If no custom key entered, check if one is configured in .env
    if (!apiKey.trim() && !keyConfiguredInEnv) {
      setValidationError("Please enter and validate an API key, or configure one in your .env file");
      return;
    }

    // Create session
    setSubmitting(true);
    setSubmitError("");
    setValidationError("");

    try {
      const session = await createSession(
        workingDirectory.trim(),
        title.trim(),
        provider,
        model,
        apiKey.trim()
      );

      // Success - notify parent
      onComplete(session.id, workingDirectory.trim(), provider, model);
    } catch (error: any) {
      console.error("Failed to create session:", error);

      // Extract error message from response
      let errorMessage = "Failed to create session";
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-cyan-400 mb-4">
          New Session Setup
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Session Title */}
          <div className="mb-4">
            <label
              htmlFor="sessionTitle"
              className="block text-gray-300 mb-2 text-sm"
            >
              Session Title:
            </label>
            <input
              id="sessionTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-cyan-500"
              placeholder="New Conversation"
              autoFocus
            />
          </div>

          {/* Working Directory */}
          <div className="mb-4">
            <label
              htmlFor="workingDir"
              className="block text-gray-300 mb-2 text-sm"
            >
              Working Directory:
            </label>
            <input
              id="workingDir"
              type="text"
              value={workingDirectory}
              onChange={(e) => setWorkingDirectory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 font-mono focus:outline-none focus:border-cyan-500"
              placeholder="/home/user/project"
            />
            <p className="text-gray-500 text-xs mt-2">
              The root directory where the AI can read files.
            </p>
          </div>

          {/* LLM Provider */}
          <div className="mb-4">
            <label
              htmlFor="provider"
              className="block text-gray-300 mb-2 text-sm"
            >
              LLM Provider:
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-cyan-500"
            >
              {providers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div className="mb-4">
            <label htmlFor="model" className="block text-gray-300 mb-2 text-sm">
              Model:
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loadingModels || models.length === 0}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              {loadingModels ? (
                <option>Loading models...</option>
              ) : models.length === 0 ? (
                <option>No models available</option>
              ) : (
                models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* API Key */}
          <div className="mb-4">
            <label
              htmlFor="apiKey"
              className="block text-gray-300 mb-2 text-sm"
            >
              API Key {keyConfiguredInEnv && <span className="text-gray-500">(Optional - configured in .env)</span>}:
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setKeyValidated(false);
                setValidationError("");
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 font-mono focus:outline-none focus:border-cyan-500"
              placeholder={keyConfiguredInEnv ? "Leave empty to use .env key" : `${provider.toUpperCase()}_API_KEY`}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleValidateKey}
                disabled={validatingKey || !apiKey.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validatingKey ? "Validating..." : "Validate Key"}
              </button>
              {keyValidated && (
                <span className="text-green-500 text-sm flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Valid
                </span>
              )}
            </div>
            {validationError && (
              <p className="text-red-400 text-xs mt-2">{validationError}</p>
            )}
            {keyConfiguredInEnv && maskedKey && (
              <p className="text-green-400 text-xs mt-2 flex items-start gap-1">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Key configured in .env: {maskedKey}. You can proceed without entering a key.</span>
              </p>
            )}
            {!keyConfiguredInEnv && (
              <p className="text-gray-500 text-xs mt-2">
                Enter your API key and validate it. For convenience, add it to your .env file.
              </p>
            )}
          </div>

          {/* Submit Error Display */}
          {submitError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {submitError}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={
                submitting ||
                loadingModels ||
                !workingDirectory.trim() ||
                !title.trim() ||
                !model ||
                // Only require validation if user entered a custom key
                (apiKey.trim() && !keyValidated) ||
                // Require either a validated custom key OR an .env key
                (!apiKey.trim() && !keyConfiguredInEnv)
              }
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating Session..." : "Start Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
