use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::process::Command;

static ROUTER_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"Router:\s*([\d.]+)").unwrap());
static PACKET_LOSS_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"([\d.]+)% packet loss").unwrap());
static PING_STATS_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"round-trip min/avg/max/stddev = ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)").unwrap()
});
static DNS_SERVER_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"nameserver\[\d+\]\s*:\s*([\d.]+)").unwrap());
static QUERY_TIME_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"Query time:\s*(\d+)\s*msec").unwrap());

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PingResult {
    pub latency_ms: Option<f64>,
    pub jitter_ms: Option<f64>,
    pub packet_loss_percent: Option<f64>,
}

impl Default for PingResult {
    fn default() -> Self {
        Self {
            latency_ms: None,
            jitter_ms: None,
            packet_loss_percent: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsInfo {
    pub servers: Vec<String>,
    pub lookup_latency_ms: Option<f64>,
}

impl Default for DnsInfo {
    fn default() -> Self {
        Self {
            servers: Vec::new(),
            lookup_latency_ms: None,
        }
    }
}

pub fn get_router_ip() -> Option<String> {
    let output = Command::new("networksetup")
        .args(["-getinfo", "Wi-Fi"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    ROUTER_RE.captures(&stdout).map(|caps| caps[1].to_string())
}

pub fn ping_host(host: &str, count: u32) -> PingResult {
    let output = Command::new("ping")
        .args(["-c", &count.to_string(), "-t", "2", host])
        .output();

    let output = match output {
        Ok(o) => o,
        Err(e) => {
            log::error!("Failed to run ping: {}", e);
            return PingResult::default();
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_ping_output(&stdout)
}

fn parse_ping_output(output: &str) -> PingResult {
    let mut result = PingResult::default();

    if let Some(caps) = PACKET_LOSS_RE.captures(output) {
        result.packet_loss_percent = caps[1].parse().ok();
    }

    if let Some(caps) = PING_STATS_RE.captures(output) {
        result.latency_ms = caps[2].parse().ok();
        result.jitter_ms = caps[4].parse().ok();
    }

    result
}

pub fn get_dns_info() -> DnsInfo {
    let mut info = DnsInfo::default();

    let output = Command::new("scutil")
        .args(["--dns"])
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            info.servers = parse_dns_servers(&stdout);
        }
    }

    if !info.servers.is_empty() {
        info.lookup_latency_ms = measure_dns_lookup(&info.servers[0]);
    }

    info
}

fn parse_dns_servers(output: &str) -> Vec<String> {
    let mut servers = Vec::new();

    for caps in DNS_SERVER_RE.captures_iter(output) {
        let server = caps[1].to_string();
        if !servers.contains(&server) {
            servers.push(server);
        }
    }

    servers
}

fn measure_dns_lookup(dns_server: &str) -> Option<f64> {
    let server_arg = format!("@{}", dns_server);
    let output = Command::new("dig")
        .args([
            &server_arg,
            "google.com",
            "+noall",
            "+stats",
            "+tries=1",
            "+time=2",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    QUERY_TIME_RE
        .captures(&stdout)
        .and_then(|caps| caps[1].parse().ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ping_output() {
        let sample = r#"
PING 1.1.1.1 (1.1.1.1): 56 data bytes
64 bytes from 1.1.1.1: icmp_seq=0 ttl=55 time=12.345 ms
64 bytes from 1.1.1.1: icmp_seq=1 ttl=55 time=14.567 ms
64 bytes from 1.1.1.1: icmp_seq=2 ttl=55 time=11.234 ms

--- 1.1.1.1 ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 11.234/12.715/14.567/1.234 ms
"#;

        let result = parse_ping_output(sample);
        assert!((result.latency_ms.unwrap() - 12.715).abs() < 0.001);
        assert!((result.jitter_ms.unwrap() - 1.234).abs() < 0.001);
        assert!((result.packet_loss_percent.unwrap() - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_parse_dns_servers() {
        let sample = r#"
DNS configuration

resolver #1
  nameserver[0] : 192.168.1.1
  nameserver[1] : 8.8.8.8
  if_index : 6 (en0)
  flags    : Request A records

resolver #2
  nameserver[0] : 192.168.1.1
  flags    : Request A records
"#;

        let servers = parse_dns_servers(sample);
        assert_eq!(servers.len(), 2);
        assert_eq!(servers[0], "192.168.1.1");
        assert_eq!(servers[1], "8.8.8.8");
    }
}
