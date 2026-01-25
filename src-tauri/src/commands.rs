use serde::{Deserialize, Serialize};

use crate::network::{get_dns_info, get_router_ip, ping_host, DnsInfo, PingResult};
use crate::wifi::{get_wifi_info, WifiInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub wifi: WifiInfo,
    pub router_ip: Option<String>,
    pub router_ping: Option<PingResult>,
    pub internet_ping: Option<PingResult>,
    pub dns: DnsInfo,
}

#[tauri::command]
pub async fn get_network_metrics() -> Result<NetworkMetrics, String> {
    let wifi = tokio::task::spawn_blocking(get_wifi_info)
        .await
        .map_err(|e| e.to_string())?;

    let router_ip = tokio::task::spawn_blocking(get_router_ip)
        .await
        .map_err(|e| e.to_string())?;

    let router_ping = if let Some(ref ip) = router_ip {
        let ip_clone = ip.clone();
        Some(
            tokio::task::spawn_blocking(move || ping_host(&ip_clone, 3))
                .await
                .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };

    let internet_ping = tokio::task::spawn_blocking(|| ping_host("1.1.1.1", 3))
        .await
        .map_err(|e| e.to_string())?;

    let dns = tokio::task::spawn_blocking(get_dns_info)
        .await
        .map_err(|e| e.to_string())?;

    Ok(NetworkMetrics {
        wifi,
        router_ip,
        router_ping,
        internet_ping: Some(internet_ping),
        dns,
    })
}
