import { useState, useEffect } from "react";

interface SettingsModalProps {
  currentProvider: string;
  currentModel: string;
  currentWorkingDirectory: string;
  onClose: () => void;
  onSave: (
    provider: string,
    model: string,
    apiKey: string,
    workingDirectory: string
  ) => Promise<void>;
}

interface Provider {
  name: string;
  displayName: string;
}

export function SettingsModal({
  currentProvider,
  currentModel,
  currentWorkingDirectory,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [provider, setProvider] = useState<string>(currentProvider);
  const [model, setModel] = useState<string>(currentModel);
  const [workingDirectory, setWorkingDirectory] = useState<string>(
    currentWorkingDirectory
  );
  const [apiKey, setApiKey] = useState<string>("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValidated, setKeyValidated] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");

  // Fetch available providers on mount
  useEffect(() => {
    fetch("http://localhost:3001/api/providers")
      .then((res) => res.json())
      .then((data) => {
        setProviders(data);
      })
      .catch((error) => {
        console.error("Failed to fetch providers:", error);
      });
  }, []);

  // Fetch models and API key when provider changes
  useEffect(() => {
    if (!provider) return;

    setLoadingModels(true);

    // Fetch models
    fetch(`http://localhost:3001/api/providers/${provider}/models`)
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models || []);
        // If current model is not in the new list, select first model
        if (data.models && !data.models.includes(model)) {
          setModel(data.models[0] || "");
        }
        setLoadingModels(false);
      })
      .catch((error) => {
        console.error("Failed to fetch models:", error);
        setLoadingModels(false);
      });

    // Fetch and pre-populate API key from .env
    fetch(`http://localhost:3001/api/providers/${provider}/api-key`)
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) {
          setApiKey(data.apiKey);
          setKeyValidated(false); // Reset validation when pre-populating
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
      const res = await fetch("http://localhost:3001/api/providers/validate", {
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

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setValidationError("Please enter an API key");
      return;
    }

    if (!keyValidated) {
      setValidationError("Please validate your API key first");
      return;
    }

    if (!workingDirectory.trim()) {
      setSaveError("Working directory is required");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      await onSave(provider, model, apiKey.trim(), workingDirectory.trim());
      onClose();
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      setSaveError(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 max-w-md w-full relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Close settings"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-cyan-400 mb-4">
          Session Settings
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
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
              onChange={(e) => {
                setProvider(e.target.value);
                setKeyValidated(false);
                setValidationError("");
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-cyan-500"
            >
              {providers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName}
                </option>
              ))}
            </select>
            {provider !== currentProvider && (
              <p className="text-yellow-400 text-xs mt-2 flex items-start gap-1">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Changing the provider will clear your conversation history to avoid compatibility issues.</span>
              </p>
            )}
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

          {/* Error Display */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {saveError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !keyValidated || loadingModels}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
