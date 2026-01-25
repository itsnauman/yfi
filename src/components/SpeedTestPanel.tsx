import {
  SpeedTestResults,
  getDownloadStatus,
  getUploadStatus,
  getSpeedTestLatencyStatus,
} from "../types/speedtest";

interface SpeedTestPanelProps {
  results: SpeedTestResults;
  onClose: () => void;
}

export function SpeedTestPanel({ results, onClose }: SpeedTestPanelProps) {
  const downloadStatus = getDownloadStatus(results.downloadBandwidth);
  const uploadStatus = getUploadStatus(results.uploadBandwidth);
  const latencyStatus = getSpeedTestLatencyStatus(results.latency);
  const jitterStatus = getSpeedTestLatencyStatus(results.jitter);

  const formatSpeed = (mbps: number): string => {
    return mbps.toFixed(1);
  };

  const formatLatency = (ms: number): string => {
    return ms.toFixed(0);
  };

  return (
    <div className="speedtest-panel">
      <div className="speedtest-header">
        <h2>Speed Test Results</h2>
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="speedtest-content">
        <div className="speedtest-summary">
          <div className={`speedtest-result speedtest-result--${downloadStatus}`}>
            <span className="speedtest-result-label">Download</span>
            <span className="speedtest-result-value">
              {formatSpeed(results.downloadBandwidth)}
              <span className="speedtest-result-unit">Mbps</span>
            </span>
          </div>
          <div className={`speedtest-result speedtest-result--${uploadStatus}`}>
            <span className="speedtest-result-label">Upload</span>
            <span className="speedtest-result-value">
              {formatSpeed(results.uploadBandwidth)}
              <span className="speedtest-result-unit">Mbps</span>
            </span>
          </div>
        </div>

        <div className="speedtest-section">
          <div className="speedtest-section-title">Latency</div>
          <div className="speedtest-row">
            <span className="speedtest-label">Ping</span>
            <span className={`speedtest-value speedtest-value--${latencyStatus}`}>
              {formatLatency(results.latency)} ms
            </span>
          </div>
          <div className="speedtest-row">
            <span className="speedtest-label">Jitter</span>
            <span className={`speedtest-value speedtest-value--${jitterStatus}`}>
              {formatLatency(results.jitter)} ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
