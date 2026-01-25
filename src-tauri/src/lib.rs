mod commands;
mod network;
mod wifi;

use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    window::{Effect, EffectState, EffectsBuilder},
    Manager, Rect, WebviewUrl, WebviewWindowBuilder,
};

const WINDOW_LABEL: &str = "main";
const WINDOW_WIDTH: f64 = 320.0;
const WINDOW_HEIGHT: f64 = 560.0;

#[tauri::command]
fn hide_window(window: tauri::Window) {
    let _ = window.hide();
}

fn toggle_window(app: &tauri::AppHandle, tray_rect: Rect) {
    if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            position_and_show_window(&window, &tray_rect);
        }
    } else {
        create_popup_window(app, &tray_rect);
    }
}

fn calculate_window_position(tray_rect: &Rect, scale_factor: f64) -> (f64, f64) {
    let tray_x = match tray_rect.position {
        tauri::Position::Physical(pos) => pos.x as f64,
        tauri::Position::Logical(pos) => pos.x * scale_factor,
    };
    let tray_width = match tray_rect.size {
        tauri::Size::Physical(size) => size.width as f64,
        tauri::Size::Logical(size) => size.width * scale_factor,
    };
    let tray_bottom = match tray_rect.position {
        tauri::Position::Physical(pos) => pos.y as f64,
        tauri::Position::Logical(pos) => pos.y * scale_factor,
    } + match tray_rect.size {
        tauri::Size::Physical(size) => size.height as f64,
        tauri::Size::Logical(size) => size.height * scale_factor,
    };

    let window_width_physical = WINDOW_WIDTH * scale_factor;
    let tray_center_x = tray_x + (tray_width / 2.0);
    let x = tray_center_x - (window_width_physical / 2.0);

    let padding = 0.0 * scale_factor;
    let y = tray_bottom + padding;

    (x, y)
}

fn position_and_show_window(window: &tauri::WebviewWindow, tray_rect: &Rect) {
    let scale_factor = window.scale_factor().unwrap_or(1.0);
    let (x, y) = calculate_window_position(tray_rect, scale_factor);

    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: x as i32,
        y: y as i32,
    }));
    let _ = window.show();
    let _ = window.set_focus();
}

fn create_popup_window(app: &tauri::AppHandle, tray_rect: &Rect) {
    let scale_factor = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0);

    let (x, y) = calculate_window_position(tray_rect, scale_factor);

    let effects = EffectsBuilder::new()
        .effect(Effect::Popover)
        .state(EffectState::Active)
        .radius(10.0)
        .build();

    let window = WebviewWindowBuilder::new(app, WINDOW_LABEL, WebviewUrl::default())
        .title("whyfi")
        .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
        .position(x / scale_factor, y / scale_factor)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .effects(effects)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(true)
        .focused(true)
        .build();

    if let Ok(window) = window {
        let window_clone = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::Focused(false) = event {
                let _ = window_clone.hide();
            }
        });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle(), rect);
                    }
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![hide_window, commands::get_network_metrics])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
