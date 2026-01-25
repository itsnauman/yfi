use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::process::Command;

use crate::wifi::get_wifi_info;

static OTHER_NETWORKS_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"Other Local Wi-Fi Networks:").unwrap());
static NETWORK_ENTRY_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\s{16,20}([^:]+):\s*$").unwrap()
});
static NETWORK_CHANNEL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"Channel:\s*(\d+)(?:\s*\((\d+(?:\.\d+)?)\s*GHz)?").unwrap()
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NearbyNetwork {
    pub ssid: String,
    pub channel: u32,
    pub frequency_ghz: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterferenceAnalysis {
    pub snr_db: Option<i32>,
    pub snr_quality: String,
    pub current_channel: Option<u32>,
    pub current_frequency_ghz: Option<f64>,
    pub same_channel_count: u32,
    pub overlapping_count: u32,
    pub nearby_networks: Vec<NearbyNetwork>,
    pub interference_level: String,
    pub suggestions: Vec<String>,
}

pub fn analyze_interference() -> InterferenceAnalysis {
    let wifi = get_wifi_info();

    let snr_db = match (wifi.signal_dbm, wifi.noise_dbm) {
        (Some(signal), Some(noise)) => Some(signal - noise),
        _ => None,
    };
    let snr_quality = classify_snr(snr_db);

    let (current_channel, current_frequency_ghz) = parse_channel_info(&wifi.channel);

    let nearby_networks = scan_nearby_networks();

    let (same_channel_count, overlapping_count) = calculate_channel_congestion(
        current_channel,
        current_frequency_ghz,
        &nearby_networks,
    );

    let interference_level = classify_interference(
        snr_db,
        same_channel_count,
        overlapping_count,
    );

    let suggestions = generate_suggestions(
        snr_db,
        &snr_quality,
        current_channel,
        current_frequency_ghz,
        same_channel_count,
        overlapping_count,
        &nearby_networks,
    );

    InterferenceAnalysis {
        snr_db,
        snr_quality,
        current_channel,
        current_frequency_ghz,
        same_channel_count,
        overlapping_count,
        nearby_networks,
        interference_level,
        suggestions,
    }
}

fn parse_channel_info(channel_str: &Option<String>) -> (Option<u32>, Option<f64>) {
    let Some(ch_str) = channel_str else {
        return (None, None);
    };

    let channel_re = match Regex::new(r"ch\s*(\d+)") {
        Ok(re) => re,
        Err(_) => return (None, None),
    };

    let channel: u32 = match channel_re
        .captures(ch_str)
        .and_then(|caps| caps.get(1))
        .and_then(|m| m.as_str().parse().ok())
    {
        Some(ch) => ch,
        None => return (None, None),
    };

    let ghz_re = match Regex::new(r"(\d+(?:\.\d+)?)\s*GHz") {
        Ok(re) => re,
        Err(_) => return (Some(channel), None),
    };

    let frequency: f64 = ghz_re
        .captures(ch_str)
        .and_then(|caps| caps.get(1))
        .and_then(|m| m.as_str().parse().ok())
        .unwrap_or_else(|| {
            if channel <= 14 {
                2.4
            } else {
                5.0
            }
        });

    (Some(channel), Some(frequency))
}

fn classify_snr(snr: Option<i32>) -> String {
    match snr {
        Some(s) if s >= 40 => "Excellent".to_string(),
        Some(s) if s >= 25 => "Good".to_string(),
        Some(s) if s >= 15 => "Fair".to_string(),
        Some(s) if s >= 10 => "Poor".to_string(),
        Some(_) => "Very Poor".to_string(),
        None => "Unknown".to_string(),
    }
}

fn scan_nearby_networks() -> Vec<NearbyNetwork> {
    let output = Command::new("system_profiler")
        .args(["SPAirPortDataType"])
        .output();

    let output = match output {
        Ok(o) => o,
        Err(e) => {
            log::error!("Failed to run system_profiler for nearby networks: {}", e);
            return Vec::new();
        }
    };

    if !output.status.success() {
        log::error!("system_profiler failed");
        return Vec::new();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_nearby_networks(&stdout)
}

fn parse_nearby_networks(output: &str) -> Vec<NearbyNetwork> {
    let mut networks = Vec::new();

    let Some(other_start) = OTHER_NETWORKS_RE.find(output) else {
        return networks;
    };

    let section = &output[other_start.end()..];

    let lines: Vec<&str> = section.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i];

        if line.trim().is_empty() {
            i += 1;
            continue;
        }

        if !line.starts_with("                ") && !line.trim().is_empty() && i > 0 {
            break;
        }

        if let Some(caps) = NETWORK_ENTRY_RE.captures(line) {
            let ssid = caps[1].trim().to_string();
            let mut channel: Option<u32> = None;
            let mut frequency: Option<f64> = None;

            i += 1;
            while i < lines.len() {
                let prop_line = lines[i];
                if prop_line.trim().is_empty() {
                    break;
                }
                if NETWORK_ENTRY_RE.is_match(prop_line) {
                    break;
                }
                if !prop_line.starts_with("                      ") {
                    break;
                }

                if let Some(ch_caps) = NETWORK_CHANNEL_RE.captures(prop_line) {
                    channel = ch_caps.get(1).and_then(|m| m.as_str().parse().ok());
                    frequency = ch_caps.get(2).and_then(|m| m.as_str().parse().ok());
                    if frequency.is_none() {
                        if let Some(ch) = channel {
                            frequency = Some(if ch <= 14 { 2.4 } else { 5.0 });
                        }
                    }
                }
                i += 1;
            }

            if let (Some(ch), Some(freq)) = (channel, frequency) {
                networks.push(NearbyNetwork {
                    ssid,
                    channel: ch,
                    frequency_ghz: freq,
                });
            }
        } else {
            i += 1;
        }
    }

    networks
}

fn calculate_channel_congestion(
    current_channel: Option<u32>,
    current_freq: Option<f64>,
    nearby: &[NearbyNetwork],
) -> (u32, u32) {
    let Some(my_channel) = current_channel else {
        return (0, 0);
    };
    let my_freq = current_freq.unwrap_or(if my_channel <= 14 { 2.4 } else { 5.0 });
    let is_24ghz = my_freq < 3.0;

    let mut same_count = 0u32;
    let mut overlap_count = 0u32;

    for network in nearby {
        if network.channel == my_channel {
            same_count += 1;
        } else if is_24ghz && network.frequency_ghz < 3.0 {
            let diff = (network.channel as i32 - my_channel as i32).abs();
            if diff < 5 {
                overlap_count += 1;
            }
        } else if !is_24ghz && network.frequency_ghz >= 5.0 {
            let my_center = channel_to_center_freq_5ghz(my_channel);
            let their_center = channel_to_center_freq_5ghz(network.channel);
            let width = 40.0;
            if (my_center - their_center).abs() < width {
                overlap_count += 1;
            }
        }
    }

    (same_count, overlap_count)
}

fn channel_to_center_freq_5ghz(channel: u32) -> f64 {
    5000.0 + (channel as f64 * 5.0)
}

fn classify_interference(
    snr: Option<i32>,
    same_channel: u32,
    overlapping: u32,
) -> String {
    let snr_score = match snr {
        Some(s) if s >= 40 => 0,
        Some(s) if s >= 25 => 1,
        Some(s) if s >= 15 => 2,
        Some(_) => 3,
        None => 1,
    };

    let congestion_score = match (same_channel, overlapping) {
        (0, 0) => 0,
        (0, o) if o <= 2 => 1,
        (s, _) if s <= 1 => 1,
        (s, o) if s <= 2 && o <= 3 => 2,
        _ => 3,
    };

    let total = snr_score + congestion_score;

    match total {
        0..=1 => "Low".to_string(),
        2..=3 => "Moderate".to_string(),
        4..=5 => "High".to_string(),
        _ => "Severe".to_string(),
    }
}

fn generate_suggestions(
    snr: Option<i32>,
    snr_quality: &str,
    current_channel: Option<u32>,
    current_freq: Option<f64>,
    same_channel: u32,
    overlapping: u32,
    nearby: &[NearbyNetwork],
) -> Vec<String> {
    let mut suggestions = Vec::new();

    if let Some(s) = snr {
        if s < 15 {
            suggestions.push("Move closer to your router or remove physical obstructions".to_string());
        }
    }

    if same_channel >= 2 {
        suggestions.push(format!(
            "{} networks on the same channel. Consider changing to a less congested channel",
            same_channel
        ));
    }

    if overlapping >= 3 {
        suggestions.push("Many overlapping networks. Try using 5 GHz if available".to_string());
    }

    if let Some(freq) = current_freq {
        if freq < 3.0 && nearby.iter().filter(|n| n.frequency_ghz >= 5.0).count() < 3 {
            suggestions.push("Consider switching to 5 GHz band for less interference".to_string());
        }
    }

    if let Some(ch) = current_channel {
        if let Some(freq) = current_freq {
            if freq < 3.0 && ch != 1 && ch != 6 && ch != 11 {
                suggestions.push(format!(
                    "Channel {} overlaps with neighbors. Use channel 1, 6, or 11 on 2.4 GHz",
                    ch
                ));
            }
        }
    }

    if snr_quality == "Excellent" && same_channel == 0 && overlapping <= 1 {
        suggestions.push("Your Wi-Fi environment looks good!".to_string());
    }

    if suggestions.is_empty() {
        suggestions.push("No major issues detected".to_string());
    }

    suggestions
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_snr() {
        assert_eq!(classify_snr(Some(45)), "Excellent");
        assert_eq!(classify_snr(Some(30)), "Good");
        assert_eq!(classify_snr(Some(20)), "Fair");
        assert_eq!(classify_snr(Some(12)), "Poor");
        assert_eq!(classify_snr(Some(5)), "Very Poor");
        assert_eq!(classify_snr(None), "Unknown");
    }

    #[test]
    fn test_parse_channel_info() {
        let (ch, freq) = parse_channel_info(&Some("ch 6, 2.4 GHz, 20 MHz".to_string()));
        assert_eq!(ch, Some(6));
        assert_eq!(freq, Some(2.4));

        let (ch, freq) = parse_channel_info(&Some("ch 149, 5 GHz, 80 MHz".to_string()));
        assert_eq!(ch, Some(149));
        assert_eq!(freq, Some(5.0));
    }

    #[test]
    fn test_classify_interference() {
        assert_eq!(classify_interference(Some(45), 0, 0), "Low");
        assert_eq!(classify_interference(Some(30), 1, 2), "Moderate");
        assert_eq!(classify_interference(Some(12), 3, 4), "Severe");
    }

    #[test]
    fn test_parse_nearby_networks() {
        let sample = r#"
        Other Local Wi-Fi Networks:
                    Neighbor1:
                          PHY Mode: 802.11ax
                          Channel: 6 (2.4GHz, 20MHz)
                          Security: WPA2 Personal
                    Neighbor2:
                          PHY Mode: 802.11ac
                          Channel: 149 (5GHz, 80MHz)
                          Security: WPA2 Personal
        "#;

        let networks = parse_nearby_networks(sample);
        assert_eq!(networks.len(), 2);
        assert_eq!(networks[0].ssid, "Neighbor1");
        assert_eq!(networks[0].channel, 6);
        assert_eq!(networks[1].ssid, "Neighbor2");
        assert_eq!(networks[1].channel, 149);
    }
}
