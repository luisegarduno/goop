import { useState, useEffect } from "react";
import { API_BASE } from "../api/client";

interface SetupModalProps {
  onComplete: (
    workingDirectory: string,
    title: string,
    provider: string,
    model: string,
    apiKey: string
  ) => void;
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
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValidated, setKeyValidated] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(false);

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

    // Fetch and pre-populate API key from .env
    fetch(`${API_BASE}/providers/${provider}/api-key`)
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) {
          setApiKey(data.apiKey);
          // Don't auto-validate, let user validate manually
        }
      })
      .catch((error) => {
        console.error("Failed to fetch API key:", error);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      workingDirectory.trim() &&
      title.trim() &&
      provider &&
      model &&
      apiKey.trim()
    ) {
      if (!keyValidated) {
        setValidationError("Please validate your API key first");
        return;
      }
      onComplete(
        workingDirectory.trim(),
        title.trim(),
        provider,
        model,
        apiKey.trim()
      );
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
              API Key:
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
              placeholder={`${provider.toUpperCase()}_API_KEY`}
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
            <p className="text-gray-500 text-xs mt-2">
              Your API key is validated but not stored. Ensure it's also in your
              .env file.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={
                !keyValidated ||
                loadingModels ||
                !workingDirectory.trim() ||
                !title.trim()
              }
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
