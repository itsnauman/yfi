import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useWifiMetrics } from "./hooks/useWifiMetrics";
import { useInterferenceCheck } from "./hooks/useInterferenceCheck";
import { Section } from "./components/Section";
import { MetricRow } from "./components/MetricRow";
import { Spinner } from "./components/Spinner";
import { InterferencePanel } from "./components/InterferencePanel";
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        invoke("hide_window");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  return (
    <div className="popover-wrapper">
      <div className="popover-arrow" />
      <main className="container">
        <div className="header">
          <h1>WhyFi</h1>
          <p className="tagline">Figure out why your Wi-Fi sucks</p>
        </div>

        {loading && !metrics && <Spinner />}

        {error && <div className="error">Error: {error}</div>}

        {interferenceAnalysis && (
          <InterferencePanel analysis={interferenceAnalysis} onClose={clearAnalysis} />
        )}

        {!interferenceAnalysis && metrics && (
          <div className="metrics-container">
            <Section title="Wi-Fi" subtitle={formatWifiSubtitle(metrics.wifi)}>
              <MetricRow
                label="Link Rate"
                value={formatValue(metrics.wifi.link_rate_mbps)}
                unit=" Mbps"
                status={getLinkRateStatus(metrics.wifi.link_rate_mbps)}
                history={history.linkRate}
              />
              <MetricRow
                label="Signal"
                value={formatValue(metrics.wifi.signal_dbm)}
                unit=" dBm"
                status={getSignalStatus(metrics.wifi.signal_dbm)}
                history={history.signal}
                invertSparkline
              />
              <MetricRow
                label="Noise"
                value={formatValue(metrics.wifi.noise_dbm)}
                unit=" dBm"
                status="neutral"
                history={history.noise}
                invertSparkline
              />
            </Section>

            <Section title="Router" subtitle={metrics.router_ip || undefined}>
              {metrics.router_ping ? (
                <>
                  <MetricRow
                    label="Ping"
                    value={formatValue(metrics.router_ping.latency_ms, 1)}
                    unit=" ms"
                    status={getPingStatus(metrics.router_ping.latency_ms)}
                    history={history.routerPing}
                  />
                  <MetricRow
                    label="Jitter"
                    value={formatValue(metrics.router_ping.jitter_ms, 1)}
                    unit=" ms"
                    status={getJitterStatus(metrics.router_ping.jitter_ms)}
                    history={history.routerJitter}
                  />
                  <MetricRow
                    label="Loss"
                    value={formatValue(metrics.router_ping.packet_loss_percent, 1)}
                    unit="%"
                    status={getLossStatus(metrics.router_ping.packet_loss_percent)}
                    history={history.routerLoss}
                  />
                </>
              ) : (
                <div className="no-data">No router detected</div>
              )}
            </Section>

            <Section title="Internet" subtitle="Connected to 1.1.1.1">
              {metrics.internet_ping ? (
                <>
                  <MetricRow
                    label="Ping"
                    value={formatValue(metrics.internet_ping.latency_ms, 1)}
                    unit=" ms"
                    status={getPingStatus(metrics.internet_ping.latency_ms)}
                    history={history.internetPing}
                  />
                  <MetricRow
                    label="Jitter"
                    value={formatValue(metrics.internet_ping.jitter_ms, 1)}
                    unit=" ms"
                    status={getJitterStatus(metrics.internet_ping.jitter_ms)}
                    history={history.internetJitter}
                  />
                  <MetricRow
                    label="Loss"
                    value={formatValue(metrics.internet_ping.packet_loss_percent, 1)}
                    unit="%"
                    status={getLossStatus(metrics.internet_ping.packet_loss_percent)}
                    history={history.internetLoss}
                  />
                </>
              ) : (
                <div className="no-data">Cannot reach internet</div>
              )}
            </Section>

            <Section
              title="DNS"
              subtitle={`Using ${truncateDns(metrics.dns.servers)}`}
            >
              <MetricRow
                label="Lookup"
                value={formatValue(metrics.dns.lookup_latency_ms, 1)}
                unit=" ms"
                status={getPingStatus(metrics.dns.lookup_latency_ms)}
                history={history.dnsLookup}
              />
            </Section>

            <div className="interference-button-container">
              <button
                className={`interference-button ${interferenceLoading ? "interference-button--scanning" : ""}`}
                onClick={checkInterference}
                disabled={interferenceLoading}
              >
                {interferenceLoading ? "Scanning..." : "Check Interference"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
