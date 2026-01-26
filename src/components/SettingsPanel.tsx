import { useState } from "react";

interface SettingsPanelProps {
  apiKey: string | null;
  onSave: (apiKey: string) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}

export function SettingsPanel({ apiKey, onSave, onClear, onClose }: SettingsPanelProps) {
  const [inputValue, setInputValue] = useState(apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSave = async () => {
    if (!inputValue.trim()) {
      setStatus({ type: "error", message: "Please enter an API key" });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await onSave(inputValue.trim());
      setStatus({ type: "success", message: "API key saved" });
    } catch {
      setStatus({ type: "error", message: "Failed to save API key" });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await onClear();
      setInputValue("");
      setStatus({ type: "success", message: "API key cleared" });
    } catch {
      setStatus({ type: "error", message: "Failed to clear API key" });
    } finally {
      setSaving(false);
    }
  };

  const maskedValue = apiKey ? "•".repeat(Math.min(apiKey.length, 32)) : "";

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <div className="settings-section-title">OpenAI API Key</div>
          <p className="settings-description">
            Enter your OpenAI API key to enable AI-powered network diagnosis.
          </p>

          <div className="api-key-input-container">
            <input
              type={showKey ? "text" : "password"}
              className="api-key-input"
              value={inputValue || (showKey ? "" : maskedValue)}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="sk-..."
              disabled={saving}
            />
            <button
              className="show-key-button"
              onClick={() => setShowKey(!showKey)}
              type="button"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>

          {status && (
            <div className={`settings-status settings-status--${status.type}`}>
              {status.message}
            </div>
          )}

          <div className="settings-actions">
            <button
              className="settings-button settings-button--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {apiKey && (
              <button
                className="settings-button settings-button--secondary"
                onClick={handleClear}
                disabled={saving}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
