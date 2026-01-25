import { useState } from "react";
import {
  InterferenceAnalysis,
  getInterferenceLevelStatus,
  getSnrStatus,
} from "../types/interference";

interface InterferencePanelProps {
  analysis: InterferenceAnalysis;
  onClose: () => void;
}

export function InterferencePanel({ analysis, onClose }: InterferencePanelProps) {
  const [showAllNetworks, setShowAllNetworks] = useState(false);

  const levelStatus = getInterferenceLevelStatus(analysis.interference_level);
  const snrStatus = getSnrStatus(analysis.snr_db);

  const displayedNetworks = showAllNetworks
    ? analysis.nearby_networks
    : analysis.nearby_networks.slice(0, 5);

  const formatFrequency = (ghz: number): string => {
    return ghz < 3 ? "2.4 GHz" : "5 GHz";
  };

  return (
    <div className="interference-panel">
      <div className="interference-header">
        <h2>Interference Analysis</h2>
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="interference-content">
        <div className="interference-summary">
          <div className={`interference-level interference-level--${levelStatus}`}>
            <span className="interference-level-label">Interference Level</span>
            <span className="interference-level-value">{analysis.interference_level}</span>
          </div>
        </div>

        <div className="interference-section">
          <div className="interference-section-title">Signal Quality</div>
          <div className="interference-row">
            <span className="interference-label">Signal-to-Noise</span>
            <span className={`interference-value interference-value--${snrStatus}`}>
              {analysis.snr_db !== null ? `${analysis.snr_db} dB` : "—"}
              <span className="interference-quality">{analysis.snr_quality}</span>
            </span>
          </div>
          <div className="interference-row">
            <span className="interference-label">Current Channel</span>
            <span className="interference-value">
              {analysis.current_channel !== null
                ? `${analysis.current_channel} (${formatFrequency(analysis.current_frequency_ghz ?? 2.4)})`
                : "—"}
            </span>
          </div>
        </div>

        <div className="interference-section">
          <div className="interference-section-title">Channel Congestion</div>
          <div className="interference-row">
            <span className="interference-label">Same channel</span>
            <span className={`interference-value ${analysis.same_channel_count >= 2 ? "interference-value--bad" : ""}`}>
              {analysis.same_channel_count} networks
            </span>
          </div>
          <div className="interference-row">
            <span className="interference-label">Overlapping</span>
            <span className={`interference-value ${analysis.overlapping_count >= 3 ? "interference-value--warning" : ""}`}>
              {analysis.overlapping_count} networks
            </span>
          </div>
        </div>

        {analysis.suggestions.length > 0 && (
          <div className="interference-section">
            <div className="interference-section-title">Suggestions</div>
            <ul className="suggestions-list">
              {analysis.suggestions.map((suggestion, idx) => (
                <li key={idx}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.nearby_networks.length > 0 && (
          <div className="interference-section">
            <div className="interference-section-title">
              Nearby Networks ({analysis.nearby_networks.length})
            </div>
            <div className="nearby-networks-list">
              {displayedNetworks.map((network, idx) => (
                <div key={idx} className="nearby-network-row">
                  <span className="network-ssid">{network.ssid}</span>
                  <span className="network-channel">
                    Ch {network.channel} ({formatFrequency(network.frequency_ghz)})
                  </span>
                </div>
              ))}
            </div>
            {analysis.nearby_networks.length > 5 && !showAllNetworks && (
              <button
                className="show-more-button"
                onClick={() => setShowAllNetworks(true)}
              >
                Show {analysis.nearby_networks.length - 5} more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
