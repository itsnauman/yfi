use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::process::Command;

static CURRENT_SSID_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"Current Wi-Fi Network:\s*(.+)").unwrap());
static CURRENT_NETWORK_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"Current Network Information:\s*\n\s*(.+):").unwrap());
static PHY_MODE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"PHY Mode:\s*(.+)").unwrap());
static CHANNEL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"Channel:\s*(\d+)(?:\s*\((\d+(?:\.\d+)?)\s*GHz,\s*(\d+)\s*MHz\))?").unwrap()
});
static TX_RATE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"Transmit Rate:\s*([\d.]+)").unwrap());
static SIGNAL_NOISE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"Signal / Noise:\s*(-?\d+)\s*dBm\s*/\s*(-?\d+)\s*dBm").unwrap());

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WifiInfo {
    pub connected: bool,
    pub ssid: Option<String>,
    pub frequency_band: Option<String>,
    pub channel: Option<String>,
    pub link_rate_mbps: Option<f64>,
    pub signal_dbm: Option<i32>,
    pub noise_dbm: Option<i32>,
}

impl Default for WifiInfo {
    fn default() -> Self {
        Self {
            connected: false,
            ssid: None,
            frequency_band: None,
            channel: None,
            link_rate_mbps: None,
            signal_dbm: None,
            noise_dbm: None,
        }
    }
}

pub fn get_wifi_info() -> WifiInfo {
    let ssid = get_current_ssid();
    log::debug!("get_wifi_info: current SSID: {:?}", ssid);

    let output = Command::new("system_profiler")
        .args(["SPAirPortDataType"])
        .output();

    let output = match output {
        Ok(o) => o,
        Err(e) => {
            log::error!("get_wifi_info: failed to run system_profiler: {}", e);
            return WifiInfo {
                connected: ssid.is_some(),
                ssid,
                ..Default::default()
            };
        }
    };

    if !output.status.success() {
        log::error!("get_wifi_info: system_profiler failed with status: {}", output.status);
        return WifiInfo {
            connected: ssid.is_some(),
            ssid,
            ..Default::default()
        };
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut info = parse_wifi_info(&stdout);
    info.ssid = ssid;
    info.connected = info.ssid.is_some();

    log::debug!(
        "get_wifi_info: signal: {:?}dBm, noise: {:?}dBm, channel: {:?}, rate: {:?}Mbps",
        info.signal_dbm,
        info.noise_dbm,
        info.channel,
        info.link_rate_mbps
    );

    info
}

fn get_current_ssid() -> Option<String> {
    let output = Command::new("networksetup")
        .args(["-getairportnetwork", "en0"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    CURRENT_SSID_RE
        .captures(&stdout)
        .map(|caps| caps[1].trim().to_string())
        .filter(|s| !s.is_empty() && s != "You are not associated with an AirPort network.")
}

fn parse_wifi_info(output: &str) -> WifiInfo {
    let mut info = WifiInfo::default();

    if let Some(caps) = CURRENT_NETWORK_RE.captures(output) {
        info.connected = true;
        info.ssid = Some(caps[1].trim().to_string());
    } else {
        return info;
    }

    if let Some(caps) = PHY_MODE_RE.captures(output) {
        let phy_mode = caps[1].trim();
        if phy_mode.contains("802.11ax") || phy_mode.contains("Wi-Fi 6") {
            info.frequency_band = Some("Wi-Fi 6".to_string());
        } else if phy_mode.contains("802.11ac") || phy_mode.contains("Wi-Fi 5") {
            info.frequency_band = Some("Wi-Fi 5".to_string());
        } else if phy_mode.contains("802.11n") {
            info.frequency_band = Some("Wi-Fi 4".to_string());
        } else {
            info.frequency_band = Some(phy_mode.to_string());
        }
    }

    if let Some(caps) = CHANNEL_RE.captures(output) {
        let channel_num: i32 = caps[1].parse().unwrap_or(0);
        if let (Some(ghz), Some(mhz)) = (caps.get(2), caps.get(3)) {
            info.channel = Some(format!(
                "ch {}, {} GHz, {} MHz",
                channel_num,
                ghz.as_str(),
                mhz.as_str()
            ));
        } else {
            let band = if channel_num <= 14 { "2.4 GHz" } else { "5 GHz" };
            info.channel = Some(format!("ch {}, {}", channel_num, band));
        }
    }

    if let Some(caps) = TX_RATE_RE.captures(output) {
        info.link_rate_mbps = caps[1].parse().ok();
    }

    if let Some(caps) = SIGNAL_NOISE_RE.captures(output) {
        info.signal_dbm = caps[1].parse().ok();
        info.noise_dbm = caps[2].parse().ok();
    }

    info
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_wifi_info() {
        let sample_output = r#"
Wi-Fi:

      Software Versions:
          CoreWLAN: 16.0 (1657)
          CoreWLANKit: 16.0 (1657)

      Interfaces:
        en0:
          Card Type: Wi-Fi
          Firmware Version: wl0: Oct 23 2023 05:30:03 version 20.10.1062.3.8.7.156 FWID 01-7ddfeb85
          MAC Address: 14:7d:da:c0:ff:ee
          Locale: FCC
          Country Code: US
          Supported PHY Modes: 802.11 a/b/g/n/ac/ax
          Supported Channels: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165
          Wake On Wireless: Supported
          AirDrop: Supported
          AirDrop Channel: 44
          Auto Unlock: Supported
          Status: Connected

      Current Network Information:
        MyNetwork:
          PHY Mode: 802.11ax
          Channel: 149 (5GHz, 80MHz)
          Network Type: Infrastructure
          Security: WPA3 Personal
          Signal / Noise: -61 dBm / -90 dBm
          Transmit Rate: 576
          MCS Index: 9
"#;

        let info = parse_wifi_info(sample_output);
        assert!(info.connected);
        assert_eq!(info.ssid, Some("MyNetwork".to_string()));
        assert_eq!(info.frequency_band, Some("Wi-Fi 6".to_string()));
        assert_eq!(info.channel, Some("ch 149, 5 GHz, 80 MHz".to_string()));
        assert_eq!(info.signal_dbm, Some(-61));
        assert_eq!(info.noise_dbm, Some(-90));
        assert_eq!(info.link_rate_mbps, Some(576.0));
    }
}
