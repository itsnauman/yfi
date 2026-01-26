mod commands;
mod interference;
mod network;
mod wifi;
#[allow(deprecated)]
use cocoa::appkit::{NSApp, NSApplication, NSApplicationActivationPolicy};
use tauri::{
    include_image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    window::{Effect, EffectState, EffectsBuilder},
    Manager, Rect, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_log::{Target, TargetKind};

const WINDOW_LABEL: &str = "main";
const WINDOW_WIDTH: f64 = 360.0;
const WINDOW_HEIGHT: f64 = 650.0;

#[tauri::command]
fn hide_window(window: tauri::Window) {
    log::debug!("hide_window command invoked");
    let _ = window.hide();
}

fn toggle_window(app: &tauri::AppHandle, tray_rect: Rect) {
    if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        if window.is_visible().unwrap_or(false) {
            log::debug!("Hiding existing window");
            let _ = window.hide();
        } else {
            log::debug!("Showing existing window");
            position_and_show_window(&window, &tray_rect);
        }
    } else {
        log::debug!("Creating new popup window");
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
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .level_for("tao", log::LevelFilter::Warn)
                .level_for("wry", log::LevelFilter::Warn)
                .level_for("tracing", log::LevelFilter::Warn)
                .level_for("tokio", log::LevelFilter::Warn)
                .level_for("hyper", log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            log::info!("WhyFi app starting up");

            #[allow(deprecated)]
            unsafe {
                let app_instance = NSApp();
                app_instance.setActivationPolicy_(NSApplicationActivationPolicy::NSApplicationActivationPolicyAccessory);
            }
            log::debug!("Set activation policy to accessory");

            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_item])?;

            #[allow(deprecated)]
            TrayIconBuilder::new()
                .icon(include_image!("icons/tray-icon.png"))
                .icon_as_template(true)
                .menu(&menu)
                .menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        log::debug!("Tray icon left-clicked");
                        toggle_window(tray.app_handle(), rect);
                    }
                })
                .build(app)?;

            log::info!("WhyFi app setup complete");
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "quit" {
                app.exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![hide_window, commands::get_network_metrics, commands::check_interference])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
