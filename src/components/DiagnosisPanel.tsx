import { DiagnosisResult } from "../types/diagnosis";

interface DiagnosisPanelProps {
  result: DiagnosisResult;
  onClose: () => void;
}

export function DiagnosisPanel({ result, onClose }: DiagnosisPanelProps) {
  const getHealthClass = (health: string) => {
    switch (health) {
      case "good":
        return "diagnosis-health--good";
      case "warning":
        return "diagnosis-health--warning";
      case "poor":
        return "diagnosis-health--bad";
      default:
        return "";
    }
  };

  const getHealthLabel = (health: string) => {
    switch (health) {
      case "good":
        return "Good";
      case "warning":
        return "Needs Attention";
      case "poor":
        return "Poor";
      default:
        return health;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case "high":
        return "diagnosis-issue--high";
      case "medium":
        return "diagnosis-issue--medium";
      case "low":
        return "diagnosis-issue--low";
      default:
        return "";
    }
  };

  return (
    <div className="diagnosis-panel">
      <div className="diagnosis-header">
        <h2>AI Diagnosis</h2>
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="diagnosis-content">
        <div className="diagnosis-summary">
          <div className={`diagnosis-health ${getHealthClass(result.overallHealth)}`}>
            <span className="diagnosis-health-label">Overall Health</span>
            <span className="diagnosis-health-value">{getHealthLabel(result.overallHealth)}</span>
          </div>
        </div>

        <div className="diagnosis-section">
          <div className="diagnosis-section-title">Summary</div>
          <p className="diagnosis-summary-text">{result.summary}</p>
        </div>

        {result.issues.length > 0 && (
          <div className="diagnosis-section">
            <div className="diagnosis-section-title">Issues Found</div>
            <div className="diagnosis-issues-list">
              {result.issues.map((issue, idx) => (
                <div key={idx} className={`diagnosis-issue ${getSeverityClass(issue.severity)}`}>
                  <div className="diagnosis-issue-header">
                    <span className="diagnosis-issue-severity">{issue.severity}</span>
                  </div>
                  <p className="diagnosis-issue-description">{issue.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.recommendations.length > 0 && (
          <div className="diagnosis-section">
            <div className="diagnosis-section-title">Recommendations</div>
            <ol className="diagnosis-recommendations-list">
              {result.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
