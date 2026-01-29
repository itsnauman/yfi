import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { attachConsole, info, debug } from "@tauri-apps/plugin-log";
import "./App.css";
import { useWifiMetrics } from "./hooks/useWifiMetrics";
import { useInterferenceCheck } from "./hooks/useInterferenceCheck";
import { useSpeedTest } from "./hooks/useSpeedTest";
import { useSettings } from "./hooks/useSettings";
import { useAIDiagnosis } from "./hooks/useAIDiagnosis";
import { Section } from "./components/Section";
import { MetricRow } from "./components/MetricRow";
import { Spinner } from "./components/Spinner";
import { InterferencePanel } from "./components/InterferencePanel";
import { SpeedTestPanel } from "./components/SpeedTestPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { DiagnosisPanel } from "./components/DiagnosisPanel";
import {
  getSignalStatus,
  getPingStatus,
  getJitterStatus,
  getLossStatus,
  getLinkRateStatus,
  WifiInfo,
} from "./types/metrics";

function App() {
  const { metrics, history, loading, error } = useWifiMetrics();
  const {
    analysis: interferenceAnalysis,
    loading: interferenceLoading,
    checkInterference,
    clearAnalysis,
  } = useInterferenceCheck();
  const {
    results: speedTestResults,
    loading: speedTestLoading,
    error: speedTestError,
    status: speedTestStatus,
    runSpeedTest,
    clearResults: clearSpeedTest,
  } = useSpeedTest();
  const { settings, saveApiKey, clearApiKey, hasApiKey } = useSettings();
  const {
    result: diagnosisResult,
    loading: diagnosisLoading,
    error: diagnosisError,
    diagnose,
    clearResult: clearDiagnosis,
  } = useAIDiagnosis();

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    attachConsole().then(() => {
      info("Frontend app mounted");
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        debug("Escape key pressed, hiding window");
        invoke("hide_window");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDiagnose = () => {
    if (!settings.openaiApiKey) return;
    diagnose(settings.openaiApiKey, {
      metrics,
      history,
      interferenceAnalysis,
      speedTestResults,
    });
  };

  const formatValue = (value: number | null | undefined, decimals = 0): string => {
    if (value === null || value === undefined) return "—";
    return value.toFixed(decimals);
  };

  const truncateDns = (servers: string[]): string => {
    if (servers.length === 0) return "Not configured";
    const first = servers[0];
    if (first.length > 15) return first.substring(0, 12) + "…";
    return first;
  };

  const formatWifiSubtitle = (wifi: WifiInfo): string | undefined => {
    if (!wifi.channel) return undefined;
    return wifi.channel;
  };

  const isAnyPanelOpen = showSettings || diagnosisResult || interferenceAnalysis || speedTestResults;
  const isAnyTaskRunning = interferenceLoading || speedTestLoading || diagnosisLoading;

  return (
    <div className="popover-wrapper">
      <main className="container">
        <div className="header">
          <div className="header-row">
            <div className="header-text">
              <h1>Yfi</h1>
              <p className="tagline">Figure out why your Wi-Fi sucks</p>
            </div>
            <button
              className="settings-icon-button"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {loading && !metrics && <Spinner />}

        {error && <div className="error">Error: {error}</div>}

        {showSettings && (
          <SettingsPanel
            apiKey={settings.openaiApiKey}
            onSave={saveApiKey}
            onClear={clearApiKey}
            onClose={() => setShowSettings(false)}
          />
        )}

        {!showSettings && diagnosisResult && (
          <DiagnosisPanel result={diagnosisResult} onClose={clearDiagnosis} />
        )}

        {!showSettings && !diagnosisResult && interferenceAnalysis && (
          <InterferencePanel analysis={interferenceAnalysis} onClose={clearAnalysis} />
        )}

        {!showSettings && !diagnosisResult && !interferenceAnalysis && speedTestResults && (
          <SpeedTestPanel results={speedTestResults} onClose={clearSpeedTest} />
        )}

        {!isAnyPanelOpen && metrics && (
          <div className="metrics-container">
            <Section title="Connection to your router" subtitle={formatWifiSubtitle(metrics.wifi)}>
              <MetricRow
                label="Link Rate"
                value={formatValue(metrics.wifi.link_rate_mbps)}
                unit=" Mbps"
                status={getLinkRateStatus(metrics.wifi.link_rate_mbps)}
                history={history.linkRate}
                tooltip="How fast data can travel between your device and router. Higher is better."
              />
              <MetricRow
                label="Signal"
                value={formatValue(metrics.wifi.signal_dbm)}
                unit=" dBm"
                status={getSignalStatus(metrics.wifi.signal_dbm)}
                history={history.signal}
                invertSparkline
                tooltip="How strong the Wi-Fi signal is. Closer to 0 is better (e.g. -50 is great, -80 is weak)."
              />
              <MetricRow
                label="Noise"
                value={formatValue(metrics.wifi.noise_dbm)}
                unit=" dBm"
                status="neutral"
                history={history.noise}
                invertSparkline
                tooltip="Background interference on your Wi-Fi channel. Lower (more negative) is better."
              />
            </Section>

            <Section title="Inside your home network" subtitle={metrics.router_ip || undefined}>
              {metrics.router_ping ? (
                <>
                  <MetricRow
                    label="Ping"
                    value={formatValue(metrics.router_ping.latency_ms, 1)}
                    unit=" ms"
                    status={getPingStatus(metrics.router_ping.latency_ms)}
                    history={history.routerPing}
                    tooltip="How long it takes to send a message to your router and get a reply. Lower is better."
                  />
                  <MetricRow
                    label="Jitter"
                    value={formatValue(metrics.router_ping.jitter_ms, 1)}
                    unit=" ms"
                    status={getJitterStatus(metrics.router_ping.jitter_ms)}
                    history={history.routerJitter}
                    tooltip="How much the ping time varies. Lower means more stable connection."
                  />
                  <MetricRow
                    label="Loss"
                    value={formatValue(metrics.router_ping.packet_loss_percent, 1)}
                    unit="%"
                    status={getLossStatus(metrics.router_ping.packet_loss_percent)}
                    history={history.routerLoss}
                    tooltip="Percentage of messages that never arrive. Should be 0% for a healthy connection."
                  />
                </>
              ) : (
                <div className="no-data">No router detected</div>
              )}
            </Section>

            <Section title="Connection to the internet" subtitle="Connected to 1.1.1.1">
              {metrics.internet_ping ? (
                <>
                  <MetricRow
                    label="Ping"
                    value={formatValue(metrics.internet_ping.latency_ms, 1)}
                    unit=" ms"
                    status={getPingStatus(metrics.internet_ping.latency_ms)}
                    history={history.internetPing}
                    tooltip="How long it takes to reach the internet and back. Lower is better for gaming and video calls."
                  />
                  <MetricRow
                    label="Jitter"
                    value={formatValue(metrics.internet_ping.jitter_ms, 1)}
                    unit=" ms"
                    status={getJitterStatus(metrics.internet_ping.jitter_ms)}
                    history={history.internetJitter}
                    tooltip="How much the internet ping varies. High jitter can cause choppy video calls."
                  />
                  <MetricRow
                    label="Loss"
                    value={formatValue(metrics.internet_ping.packet_loss_percent, 1)}
                    unit="%"
                    status={getLossStatus(metrics.internet_ping.packet_loss_percent)}
                    history={history.internetLoss}
                    tooltip="Percentage of data packets lost on the way to the internet. Should be 0%."
                  />
                </>
              ) : (
                <div className="no-data">Cannot reach internet</div>
              )}
            </Section>

            <Section
              title="Website name lookup"
              subtitle={`Using ${truncateDns(metrics.dns.servers)}`}
            >
              <MetricRow
                label="DNS Lookup"
                value={formatValue(metrics.dns.lookup_latency_ms, 1)}
                unit=" ms"
                status={getPingStatus(metrics.dns.lookup_latency_ms)}
                history={history.dnsLookup}
                tooltip="How long it takes to translate a website name (like google.com) into an address. Lower is faster browsing."
              />
            </Section>

            <div className="interference-button-container">
              <button
                className={`interference-button ${interferenceLoading ? "interference-button--scanning" : ""}`}
                onClick={checkInterference}
                disabled={isAnyTaskRunning}
              >
                {interferenceLoading ? "Scanning..." : "Check Interference"}
              </button>
            </div>

            <div className="speedtest-button-container">
              <button
                className={`speedtest-button ${speedTestLoading ? "speedtest-button--running" : ""}`}
                onClick={runSpeedTest}
                disabled={isAnyTaskRunning}
              >
                {speedTestLoading ? (speedTestStatus || "Testing...") : "Speed Test"}
              </button>
              {speedTestError && (
                <div className="speedtest-error">{speedTestError}</div>
              )}
            </div>

            <div className="diagnose-button-container">
              <button
                className={`diagnose-button ${diagnosisLoading ? "diagnose-button--running" : ""}`}
                onClick={handleDiagnose}
                disabled={isAnyTaskRunning || !hasApiKey}
              >
                {diagnosisLoading ? "Analyzing..." : "Diagnose with AI"}
              </button>
              {!hasApiKey && (
                <div className="diagnose-hint">
                  Configure your OpenAI API key in Settings
                </div>
              )}
              {diagnosisError && (
                <div className="diagnose-error">{diagnosisError}</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
