#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Utc;
use getrandom::fill as random_fill;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

#[cfg(target_os = "macos")]
use objc2_app_kit::NSWindow;

const CONTROL_EVENT: &str = "healthview-control-request";
const CONTROL_SESSION_FILE_NAME: &str = "control-session.json";
const DESKTOP_IDENTIFIER: &str = "me.healthviewos.desktop";

#[derive(Clone, Default)]
struct ControlBridgeState {
    pending: Arc<Mutex<HashMap<String, mpsc::Sender<JsonValue>>>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ControlSession {
    instance_id: String,
    pid: u32,
    port: u16,
    started_at: String,
    token: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ControlRequestPayload {
    id: String,
    operation: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    commands: Option<JsonValue>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompleteControlRequestInput {
    id: String,
    response: JsonValue,
}

#[derive(Deserialize)]
struct ControlCommandsRequest {
    commands: JsonValue,
}

struct HttpRequest {
    body: Vec<u8>,
    headers: HashMap<String, String>,
    method: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopVaultInfo {
    app_data_dir: String,
    database_path: String,
    files_dir: String,
    vault_dir: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeTitlebarMetrics {
    top_inset: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentProviderConfig {
    provider: String,
    model: String,
    #[serde(rename = "baseURL")]
    #[serde(skip_serializing_if = "Option::is_none")]
    base_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    api_key: Option<String>,
    configured: bool,
    label: String,
    use_responses: bool,
}

struct AgentProviderDefinition {
    id: &'static str,
    label: &'static str,
    default_model: &'static str,
    models: &'static [&'static str],
    enabled: bool,
    env_names: &'static [&'static str],
    base_url: Option<&'static str>,
    use_responses: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentProviderStatus {
    id: String,
    label: String,
    default_model: String,
    models: Vec<String>,
    enabled: bool,
    env_names: Vec<String>,
    configured: bool,
    selected: bool,
    model: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentSettings {
    provider: String,
    model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    api_key: Option<String>,
    health_data_access_enabled: bool,
    providers: Vec<AgentProviderStatus>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateAgentSettingsInput {
    provider: String,
    model: Option<String>,
    health_data_access_enabled: Option<bool>,
    #[allow(dead_code)]
    api_key: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentProviderHttpRequest {
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentProviderHttpResponse {
    status: u16,
    status_text: String,
    headers: Vec<(String, String)>,
    body: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct XaiVoiceClientSecret {
    value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    expires_at: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentThread {
    id: String,
    title: String,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentMessage {
    id: String,
    thread_id: String,
    role: String,
    text: String,
    created_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppendAgentMessageInput {
    thread_id: String,
    role: String,
    text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentThreadInput {
    thread_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentSessionItemsInput {
    session_id: String,
    limit: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddAgentSessionItemsInput {
    session_id: String,
    items: Vec<JsonValue>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentSessionInput {
    session_id: String,
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

fn random_hex(byte_count: usize) -> Result<String, String> {
    let mut bytes = vec![0_u8; byte_count];
    random_fill(&mut bytes).map_err(|error| error.to_string())?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn unique_id(prefix: &str) -> String {
    let now = Utc::now();
    let nanos = now
        .timestamp_nanos_opt()
        .unwrap_or_else(|| now.timestamp_micros() * 1000);
    format!("{prefix}_{nanos}")
}

fn default_vault_dir() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "Unable to resolve home directory.".to_string())?;
    Ok(home.join("Documents").join("HealthView OS"))
}

fn vault_info() -> Result<DesktopVaultInfo, String> {
    let vault_dir = default_vault_dir()?;
    let app_data_dir = vault_dir.join(".healthviewos");
    let files_dir = vault_dir.join("files");
    let database_path = app_data_dir.join("healthviewos.sqlite");

    Ok(DesktopVaultInfo {
        app_data_dir: path_to_string(app_data_dir),
        vault_dir: path_to_string(vault_dir),
        files_dir: path_to_string(files_dir),
        database_path: path_to_string(database_path),
    })
}

fn ensure_vault_dirs(info: &DesktopVaultInfo) -> Result<(), String> {
    fs::create_dir_all(&info.files_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(Path::new(&info.vault_dir).join("exports"))
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(Path::new(&info.vault_dir).join("notes"))
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(Path::new(&info.app_data_dir).join("cache"))
        .map_err(|error| error.to_string())
}

fn control_app_data_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var_os("HOME")
            .map(PathBuf::from)
            .ok_or_else(|| "Unable to resolve home directory.".to_string())?;
        return Ok(home
            .join("Library")
            .join("Application Support")
            .join(DESKTOP_IDENTIFIER));
    }

    #[cfg(target_os = "windows")]
    {
        let app_data = std::env::var_os("APPDATA")
            .map(PathBuf::from)
            .ok_or_else(|| "Unable to resolve APPDATA.".to_string())?;
        return Ok(app_data.join(DESKTOP_IDENTIFIER));
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        if let Some(xdg_data_home) = std::env::var_os("XDG_DATA_HOME").map(PathBuf::from) {
            return Ok(xdg_data_home.join(DESKTOP_IDENTIFIER));
        }

        let home = std::env::var_os("HOME")
            .map(PathBuf::from)
            .ok_or_else(|| "Unable to resolve home directory.".to_string())?;
        Ok(home.join(".local").join("share").join(DESKTOP_IDENTIFIER))
    }
}

fn open_database() -> Result<(DesktopVaultInfo, Connection), String> {
    let info = vault_info()?;
    ensure_vault_dirs(&info)?;
    let connection = Connection::open(&info.database_path).map_err(|error| error.to_string())?;
    run_migrations(&connection)?;
    Ok((info, connection))
}

fn run_migrations(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS app_metadata (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS workspace_state (
              id TEXT PRIMARY KEY,
              workspace_json TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agent_settings (
              id TEXT PRIMARY KEY,
              provider TEXT NOT NULL,
              model TEXT NOT NULL,
              health_data_access_enabled INTEGER NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agent_threads (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agent_messages (
              id TEXT PRIMARY KEY,
              thread_id TEXT NOT NULL,
              role TEXT NOT NULL,
              text TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agent_session_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id TEXT NOT NULL,
              item_json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            "#,
        )
        .map_err(|error| error.to_string())
}

fn load_workspace_json(connection: &Connection) -> Result<JsonValue, String> {
    let raw = connection
        .query_row(
            "SELECT workspace_json FROM workspace_state WHERE id = 'default'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let Some(raw) = raw else {
        return Err("No desktop workspace has been created.".to_string());
    };

    serde_json::from_str(&raw).map_err(|error| error.to_string())
}

fn save_workspace_json(connection: &Connection, workspace: &JsonValue) -> Result<JsonValue, String> {
    let now = now_iso();
    let payload = serde_json::to_string(workspace).map_err(|error| error.to_string())?;
    connection
        .execute(
            "INSERT INTO workspace_state (id, workspace_json, updated_at)
             VALUES ('default', ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET workspace_json = excluded.workspace_json, updated_at = excluded.updated_at",
            params![payload, now],
        )
        .map_err(|error| error.to_string())?;
    Ok(workspace.clone())
}

fn dotenv_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(current_dir) = std::env::current_dir() {
        for ancestor in current_dir.ancestors() {
            paths.push(ancestor.join(".env"));
        }
    }
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    for ancestor in manifest_dir.ancestors() {
        paths.push(ancestor.join(".env"));
    }
    paths
}

fn dotenv_value(name: &str) -> Option<String> {
    for path in dotenv_paths() {
        let Ok(contents) = fs::read_to_string(path) else {
            continue;
        };
        for line in contents.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            let Some((key, value)) = trimmed.split_once('=') else {
                continue;
            };
            if key.trim() != name {
                continue;
            }
            let value = value.trim().trim_matches('"').trim_matches('\'').to_string();
            if !value.is_empty() {
                return Some(value);
            }
        }
    }
    None
}

fn env_or_dotenv(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| dotenv_value(name))
}

fn agent_provider_definitions() -> Vec<AgentProviderDefinition> {
    vec![
        AgentProviderDefinition {
            id: "openai",
            label: "OpenAI",
            default_model: "gpt-5.5",
            models: &["gpt-5.5", "gpt-5.1", "gpt-5", "gpt-4.1", "gpt-4o-mini"],
            enabled: true,
            env_names: &[
                "HEALTHVIEW_OPENAI_API_KEY",
                "HEALTHVIEWOS_OPENAI_API_KEY",
                "OPENAI_API_KEY",
            ],
            base_url: None,
            use_responses: true,
        },
        AgentProviderDefinition {
            id: "xai",
            label: "xAI",
            default_model: "grok-4.3",
            models: &["grok-4.3", "grok-4.3-fast", "grok-4-latest"],
            enabled: true,
            env_names: &[
                "HEALTHVIEW_XAI_API_KEY",
                "HEALTHVIEWOS_XAI_API_KEY",
                "XAI_API_KEY",
            ],
            base_url: Some("https://api.x.ai/v1"),
            use_responses: false,
        },
    ]
}

fn agent_provider_definition(provider: &str) -> AgentProviderDefinition {
    agent_provider_definitions()
        .into_iter()
        .find(|definition| definition.id == provider)
        .unwrap_or_else(|| agent_provider_definitions().remove(1))
}

fn normalize_agent_provider(provider: &str) -> String {
    if agent_provider_definitions()
        .iter()
        .any(|definition| definition.id == provider)
    {
        provider.to_string()
    } else {
        "xai".to_string()
    }
}

fn normalize_agent_model(provider: &str, model: Option<&str>) -> String {
    let definition = agent_provider_definition(provider);
    let trimmed = model.map(str::trim).filter(|value| !value.is_empty());
    match trimmed {
        Some(value) if definition.models.contains(&value) => value.to_string(),
        _ => definition.default_model.to_string(),
    }
}

fn agent_provider_key(definition: &AgentProviderDefinition) -> Option<String> {
    definition.env_names.iter().find_map(|name| env_or_dotenv(name))
}

fn get_or_create_agent_settings_from_db(connection: &Connection) -> Result<(String, String, bool), String> {
    let existing = connection
        .query_row(
            "SELECT provider, model, health_data_access_enabled FROM agent_settings WHERE id = 'default'",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)? != 0,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;

    if let Some((provider, model, health_data_access_enabled)) = existing {
        let provider = normalize_agent_provider(&provider);
        let model = normalize_agent_model(&provider, Some(&model));
        return Ok((provider, model, health_data_access_enabled));
    }

    let provider = "xai".to_string();
    let model = normalize_agent_model(&provider, None);
    connection
        .execute(
            "INSERT INTO agent_settings (id, provider, model, health_data_access_enabled, updated_at)
             VALUES ('default', ?1, ?2, 1, ?3)",
            params![provider, model, now_iso()],
        )
        .map_err(|error| error.to_string())?;

    Ok((provider, model, true))
}

fn save_agent_settings_to_db(
    connection: &Connection,
    input: UpdateAgentSettingsInput,
) -> Result<(String, String, bool), String> {
    let current = get_or_create_agent_settings_from_db(connection)?;
    let provider = normalize_agent_provider(&input.provider);
    let model = normalize_agent_model(&provider, input.model.as_deref());
    let health_data_access_enabled = input.health_data_access_enabled.unwrap_or(current.2);

    connection
        .execute(
            "INSERT INTO agent_settings (id, provider, model, health_data_access_enabled, updated_at)
             VALUES ('default', ?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET
               provider = excluded.provider,
               model = excluded.model,
               health_data_access_enabled = excluded.health_data_access_enabled,
               updated_at = excluded.updated_at",
            params![
                provider,
                model,
                if health_data_access_enabled { 1 } else { 0 },
                now_iso()
            ],
        )
        .map_err(|error| error.to_string())?;

    Ok((provider, model, health_data_access_enabled))
}

fn build_agent_settings(provider: String, model: String, health_data_access_enabled: bool) -> AgentSettings {
    let providers = agent_provider_definitions()
        .into_iter()
        .map(|definition| {
            let configured = agent_provider_key(&definition).is_some();
            AgentProviderStatus {
                id: definition.id.to_string(),
                label: definition.label.to_string(),
                default_model: definition.default_model.to_string(),
                models: definition.models.iter().map(|value| value.to_string()).collect(),
                enabled: definition.enabled,
                env_names: definition.env_names.iter().map(|value| value.to_string()).collect(),
                configured,
                selected: definition.id == provider,
                model: if definition.id == provider {
                    model.clone()
                } else {
                    definition.default_model.to_string()
                },
            }
        })
        .collect();
    let definition = agent_provider_definition(&provider);

    AgentSettings {
        api_key: agent_provider_key(&definition),
        health_data_access_enabled,
        model,
        provider,
        providers,
    }
}

fn get_or_create_agent_thread_from_db(connection: &mut Connection) -> Result<AgentThread, String> {
    let active_thread_id = connection
        .query_row(
            "SELECT value FROM app_metadata WHERE key = 'active_agent_thread_id'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    if let Some(thread_id) = active_thread_id {
        if let Some(thread) = get_agent_thread_from_db(connection, &thread_id)? {
            return Ok(thread);
        }
    }

    create_agent_thread_in_db(connection)
}

fn get_agent_thread_from_db(connection: &Connection, thread_id: &str) -> Result<Option<AgentThread>, String> {
    connection
        .query_row(
            "SELECT id, title, created_at, updated_at FROM agent_threads WHERE id = ?1",
            params![thread_id],
            |row| {
                Ok(AgentThread {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())
}

fn create_agent_thread_in_db(connection: &mut Connection) -> Result<AgentThread, String> {
    let now = now_iso();
    let thread = AgentThread {
        id: unique_id("agent_thread"),
        title: "HealthView chat".to_string(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    let tx = connection.transaction().map_err(|error| error.to_string())?;
    tx.execute(
        "INSERT INTO agent_threads (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![thread.id, thread.title, thread.created_at, thread.updated_at],
    )
    .map_err(|error| error.to_string())?;
    tx.execute(
        "INSERT INTO app_metadata (key, value, updated_at)
         VALUES ('active_agent_thread_id', ?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![thread.id, now],
    )
    .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(thread)
}

fn list_agent_threads_from_db(connection: &Connection) -> Result<Vec<AgentThread>, String> {
    let mut statement = connection
        .prepare("SELECT id, title, created_at, updated_at FROM agent_threads ORDER BY updated_at DESC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(AgentThread {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn list_agent_messages_from_db(connection: &Connection, thread_id: &str) -> Result<Vec<AgentMessage>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, thread_id, role, text, created_at
             FROM agent_messages WHERE thread_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![thread_id], |row| {
            Ok(AgentMessage {
                id: row.get(0)?,
                thread_id: row.get(1)?,
                role: row.get(2)?,
                text: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn append_agent_message_to_db(
    connection: &Connection,
    input: AppendAgentMessageInput,
) -> Result<AgentMessage, String> {
    let now = now_iso();
    let message = AgentMessage {
        id: unique_id("agent_message"),
        thread_id: input.thread_id,
        role: input.role,
        text: input.text,
        created_at: now.clone(),
    };
    connection
        .execute(
            "INSERT INTO agent_messages (id, thread_id, role, text, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                message.id,
                message.thread_id,
                message.role,
                message.text,
                message.created_at
            ],
        )
        .map_err(|error| error.to_string())?;

    let current_title = connection
        .query_row(
            "SELECT title FROM agent_threads WHERE id = ?1",
            params![message.thread_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let next_title = if message.role == "user" && current_title.as_deref() == Some("HealthView chat") {
        message.text.chars().take(42).collect::<String>()
    } else {
        current_title.unwrap_or_else(|| "HealthView chat".to_string())
    };
    connection
        .execute(
            "UPDATE agent_threads SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![next_title, now, message.thread_id],
        )
        .map_err(|error| error.to_string())?;

    Ok(message)
}

fn get_agent_session_items_from_db(
    connection: &Connection,
    session_id: &str,
    limit: Option<i64>,
) -> Result<Vec<JsonValue>, String> {
    let raw_items = if let Some(limit) = limit {
        let mut statement = connection
            .prepare(
                "SELECT item_json FROM (
                   SELECT item_json, id FROM agent_session_items
                   WHERE session_id = ?1 ORDER BY id DESC LIMIT ?2
                 ) ORDER BY id ASC",
            )
            .map_err(|error| error.to_string())?;
        let values = statement
            .query_map(params![session_id, limit], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        values
    } else {
        let mut statement = connection
            .prepare("SELECT item_json FROM agent_session_items WHERE session_id = ?1 ORDER BY id ASC")
            .map_err(|error| error.to_string())?;
        let values = statement
            .query_map(params![session_id], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        values
    };

    raw_items
        .into_iter()
        .map(|value| serde_json::from_str(&value).map_err(|error| error.to_string()))
        .collect()
}

fn add_agent_session_items_to_db(
    connection: &mut Connection,
    input: AddAgentSessionItemsInput,
) -> Result<(), String> {
    let tx = connection.transaction().map_err(|error| error.to_string())?;
    let now = now_iso();
    for item in input.items {
        let item_json = serde_json::to_string(&item).map_err(|error| error.to_string())?;
        tx.execute(
            "INSERT INTO agent_session_items (session_id, item_json, created_at) VALUES (?1, ?2, ?3)",
            params![input.session_id, item_json, now],
        )
        .map_err(|error| error.to_string())?;
    }
    tx.commit().map_err(|error| error.to_string())
}

fn pop_agent_session_item_from_db(
    connection: &Connection,
    session_id: &str,
) -> Result<Option<JsonValue>, String> {
    let row = connection
        .query_row(
            "SELECT id, item_json FROM agent_session_items WHERE session_id = ?1 ORDER BY id DESC LIMIT 1",
            params![session_id],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some((id, item_json)) = row else {
        return Ok(None);
    };
    connection
        .execute("DELETE FROM agent_session_items WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    serde_json::from_str(&item_json)
        .map(Some)
        .map_err(|error| error.to_string())
}

fn is_allowed_agent_provider_url(url: &reqwest::Url) -> bool {
    if url.scheme() != "https" {
        return false;
    }
    matches!(url.host_str(), Some("api.openai.com") | Some("api.x.ai"))
}

fn json_string_at<'a>(value: &'a JsonValue, path: &[&str]) -> Option<&'a str> {
    let mut current = value;
    for key in path {
        current = current.get(*key)?;
    }
    current.as_str()
}

fn extract_xai_voice_client_secret(value: &JsonValue) -> Option<&str> {
    json_string_at(value, &["value"])
        .or_else(|| json_string_at(value, &["client_secret", "value"]))
        .or_else(|| json_string_at(value, &["client_secret"]))
        .or_else(|| json_string_at(value, &["secret"]))
        .or_else(|| json_string_at(value, &["token"]))
}

fn get_native_titlebar_metrics(app: &AppHandle) -> Result<NativeTitlebarMetrics, String> {
    #[cfg(target_os = "macos")]
    {
        let window = app
            .get_webview_window("main")
            .ok_or_else(|| "Main window is unavailable.".to_string())?;
        let (sender, receiver) = std::sync::mpsc::sync_channel(1);

        window
            .with_webview(move |webview| unsafe {
                let ns_window: &NSWindow = &*webview.ns_window().cast();
                let frame = ns_window.frame();
                let content_layout_rect = ns_window.contentLayoutRect();
                let content_layout_top =
                    content_layout_rect.origin.y + content_layout_rect.size.height;
                let top_inset = (frame.size.height - content_layout_top).max(0.0);
                let _ = sender.send(top_inset);
            })
            .map_err(|error| error.to_string())?;

        let top_inset = receiver
            .recv()
            .map_err(|error| format!("Unable to read native titlebar inset: {error}"))?;

        return Ok(NativeTitlebarMetrics { top_inset });
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Ok(NativeTitlebarMetrics { top_inset: 0.0 })
    }
}

fn write_control_session(session: &ControlSession) -> Result<(), String> {
    let dir = control_app_data_dir()?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let path = dir.join(CONTROL_SESSION_FILE_NAME);
    let payload = serde_json::to_string_pretty(session).map_err(|error| error.to_string())?;
    fs::write(path, payload).map_err(|error| error.to_string())
}

fn find_header_end(buffer: &[u8]) -> Option<usize> {
    buffer
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|position| position + 4)
}

fn read_http_request(stream: &mut TcpStream) -> Result<HttpRequest, String> {
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 1024];

    while find_header_end(&buffer).is_none() {
        let count = stream.read(&mut chunk).map_err(|error| error.to_string())?;
        if count == 0 {
            return Err("Connection closed before HTTP headers were complete.".to_string());
        }
        buffer.extend_from_slice(&chunk[..count]);
        if buffer.len() > 1024 * 1024 {
            return Err("HTTP request is too large.".to_string());
        }
    }

    let header_end = find_header_end(&buffer).ok_or_else(|| "Missing HTTP headers.".to_string())?;
    let header_text = String::from_utf8_lossy(&buffer[..header_end]);
    let mut lines = header_text.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "Missing HTTP request line.".to_string())?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts
        .next()
        .ok_or_else(|| "Missing HTTP method.".to_string())?
        .to_string();
    let path = request_parts
        .next()
        .ok_or_else(|| "Missing HTTP path.".to_string())?
        .split('?')
        .next()
        .unwrap_or("")
        .to_string();

    let mut headers = HashMap::new();
    for line in lines {
        if line.is_empty() {
            continue;
        }
        if let Some((name, value)) = line.split_once(':') {
            headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
        }
    }

    let content_length = headers
        .get("content-length")
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0);
    let mut body = buffer[header_end..].to_vec();
    while body.len() < content_length {
        let count = stream.read(&mut chunk).map_err(|error| error.to_string())?;
        if count == 0 {
            return Err("Connection closed before HTTP body was complete.".to_string());
        }
        body.extend_from_slice(&chunk[..count]);
        if body.len() > 1024 * 1024 {
            return Err("HTTP request body is too large.".to_string());
        }
    }
    body.truncate(content_length);

    Ok(HttpRequest {
        body,
        headers,
        method,
        path,
    })
}

fn http_status_text(status: u16) -> &'static str {
    match status {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        405 => "Method Not Allowed",
        500 => "Internal Server Error",
        504 => "Gateway Timeout",
        _ => "Error",
    }
}

fn write_json_response(stream: &mut TcpStream, status: u16, payload: JsonValue) {
    let body = serde_json::to_string(&payload).unwrap_or_else(|_| {
        "{\"ok\":false,\"error\":\"Unable to serialize response.\"}".to_string()
    });
    let response = format!(
        "HTTP/1.1 {status} {status_text}\r\nContent-Type: application/json\r\nContent-Length: {length}\r\nConnection: close\r\n\r\n{body}",
        status_text = http_status_text(status),
        length = body.as_bytes().len(),
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn dispatch_control_request(
    app: &AppHandle,
    bridge: &ControlBridgeState,
    operation: &str,
    commands: Option<JsonValue>,
) -> Result<JsonValue, String> {
    let id = random_hex(16)?;
    let (sender, receiver) = mpsc::channel();
    bridge
        .pending
        .lock()
        .map_err(|_| "Control bridge pending map is unavailable.".to_string())?
        .insert(id.clone(), sender);

    let payload = ControlRequestPayload {
        commands,
        id: id.clone(),
        operation: operation.to_string(),
    };

    if let Err(error) = app.emit(CONTROL_EVENT, payload) {
        let _ = bridge
            .pending
            .lock()
            .map_err(|_| "Control bridge pending map is unavailable.".to_string())?
            .remove(&id);
        return Err(error.to_string());
    }

    match receiver.recv_timeout(Duration::from_secs(10)) {
        Ok(response) => Ok(response),
        Err(mpsc::RecvTimeoutError::Timeout) => {
            let _ = bridge
                .pending
                .lock()
                .map_err(|_| "Control bridge pending map is unavailable.".to_string())?
                .remove(&id);
            Err("Timed out waiting for HealthView OS UI to complete the control request.".to_string())
        }
        Err(error) => Err(error.to_string()),
    }
}

fn handle_control_connection(
    mut stream: TcpStream,
    app: AppHandle,
    bridge: ControlBridgeState,
    session: ControlSession,
) {
    let request = match read_http_request(&mut stream) {
        Ok(request) => request,
        Err(error) => {
            write_json_response(&mut stream, 400, json!({ "error": error, "ok": false }));
            return;
        }
    };

    let authorized = request
        .headers
        .get("authorization")
        .map(|value| value == &format!("Bearer {}", session.token))
        .unwrap_or(false);
    if !authorized {
        write_json_response(
            &mut stream,
            401,
            json!({ "error": "Unauthorized HealthView OS control request.", "ok": false }),
        );
        return;
    }

    let response = match (request.method.as_str(), request.path.as_str()) {
        ("GET", "/health") => Ok(json!({
            "instanceId": session.instance_id,
            "message": "HealthView OS desktop control bridge is running.",
            "ok": true,
            "pid": session.pid,
            "port": session.port,
            "startedAt": session.started_at,
        })),
        ("GET", "/state") => dispatch_control_request(&app, &bridge, "state", None),
        ("POST", "/commands/preview") | ("POST", "/commands/execute") => {
            let input = serde_json::from_slice::<ControlCommandsRequest>(&request.body)
                .map_err(|error| error.to_string());
            match input {
                Ok(input) => dispatch_control_request(
                    &app,
                    &bridge,
                    if request.path == "/commands/preview" {
                        "preview"
                    } else {
                        "execute"
                    },
                    Some(input.commands),
                ),
                Err(error) => Err(error),
            }
        }
        ("POST", _) | ("GET", _) => Err("Unknown HealthView OS control endpoint.".to_string()),
        _ => Err("Unsupported HealthView OS control method.".to_string()),
    };

    match response {
        Ok(payload) => write_json_response(&mut stream, 200, payload),
        Err(error) if error.contains("Timed out") => {
            write_json_response(&mut stream, 504, json!({ "error": error, "ok": false }))
        }
        Err(error) => write_json_response(&mut stream, 400, json!({ "error": error, "ok": false })),
    }
}

fn start_control_bridge(app: AppHandle, bridge: ControlBridgeState) -> Result<(), String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|error| error.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let session = ControlSession {
        instance_id: random_hex(16)?,
        pid: std::process::id(),
        port,
        started_at: now_iso(),
        token: random_hex(32)?,
    };

    write_control_session(&session)?;

    thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    let app = app.clone();
                    let bridge = bridge.clone();
                    let session = session.clone();
                    thread::spawn(move || handle_control_connection(stream, app, bridge, session));
                }
                Err(error) => {
                    eprintln!("[healthview:control] failed to accept request: {error}");
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    open::that(url)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_desktop_vault_info() -> Result<DesktopVaultInfo, String> {
    let info = vault_info()?;
    ensure_vault_dirs(&info)?;
    Ok(info)
}

#[tauri::command]
fn load_workspace() -> Result<JsonValue, String> {
    let (_info, connection) = open_database()?;
    load_workspace_json(&connection)
}

#[tauri::command]
fn save_workspace(workspace: JsonValue) -> Result<JsonValue, String> {
    let (_info, connection) = open_database()?;
    save_workspace_json(&connection, &workspace)
}

#[tauri::command]
fn reset_desktop_vault() -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("Vault reset is only available in development builds.".to_string());
    }

    let info = vault_info()?;
    if Path::new(&info.vault_dir).exists() {
        fs::remove_dir_all(&info.vault_dir).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_agent_provider_config() -> Result<AgentProviderConfig, String> {
    let (_info, connection) = open_database()?;
    let (provider, model, _health_data_access_enabled) = get_or_create_agent_settings_from_db(&connection)?;
    let definition = agent_provider_definition(&provider);
    let api_key = agent_provider_key(&definition);

    Ok(AgentProviderConfig {
        base_url: definition.base_url.map(|value| value.to_string()),
        configured: definition.enabled && api_key.is_some(),
        api_key,
        label: definition.label.to_string(),
        model,
        provider,
        use_responses: definition.use_responses,
    })
}

#[tauri::command]
async fn agent_provider_fetch(
    input: AgentProviderHttpRequest,
) -> Result<AgentProviderHttpResponse, String> {
    let url = reqwest::Url::parse(&input.url).map_err(|error| error.to_string())?;
    if !is_allowed_agent_provider_url(&url) {
        return Err("Provider request host is not allowed.".to_string());
    }

    let method = reqwest::Method::from_bytes(input.method.as_bytes())
        .map_err(|error| error.to_string())?;
    let mut headers = HeaderMap::new();
    for (name, value) in input.headers {
        let header_name = HeaderName::from_str(&name).map_err(|error| error.to_string())?;
        let header_value = HeaderValue::from_str(&value).map_err(|error| error.to_string())?;
        headers.insert(header_name, header_value);
    }

    let client = reqwest::Client::new();
    let mut request = client.request(method, url).headers(headers);
    if let Some(body) = input.body {
        request = request.body(body);
    }

    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    let headers = response
        .headers()
        .iter()
        .filter_map(|(name, value)| {
            value
                .to_str()
                .ok()
                .map(|value| (name.as_str().to_string(), value.to_string()))
        })
        .collect();
    let body = response.text().await.map_err(|error| error.to_string())?;

    Ok(AgentProviderHttpResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or("").to_string(),
        headers,
        body,
    })
}

#[tauri::command]
async fn create_xai_voice_client_secret() -> Result<XaiVoiceClientSecret, String> {
    let definition = agent_provider_definition("xai");
    let api_key = agent_provider_key(&definition).ok_or_else(|| {
        "xAI is not configured. Set HEALTHVIEW_XAI_API_KEY or XAI_API_KEY before starting voice chat."
            .to_string()
    })?;

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.x.ai/v1/realtime/client_secrets")
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .body(json!({ "expires_after": { "seconds": 300 } }).to_string())
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let body = response.text().await.map_err(|error| error.to_string())?;

    if !status.is_success() {
        return Err(format!(
            "xAI voice token request failed with status {}: {}",
            status.as_u16(),
            body
        ));
    }

    let parsed: JsonValue = serde_json::from_str(&body).map_err(|error| error.to_string())?;
    let value = extract_xai_voice_client_secret(&parsed)
        .ok_or_else(|| "xAI voice token response did not include a client secret.".to_string())?
        .to_string();
    let expires_at = parsed
        .get("expires_at")
        .and_then(JsonValue::as_i64)
        .or_else(|| parsed.get("expiresAt").and_then(JsonValue::as_i64))
        .or_else(|| {
            parsed
                .get("client_secret")
                .and_then(|client_secret| client_secret.get("expires_at"))
                .and_then(JsonValue::as_i64)
        });

    Ok(XaiVoiceClientSecret { expires_at, value })
}

#[tauri::command]
fn get_agent_settings() -> Result<AgentSettings, String> {
    let (_info, connection) = open_database()?;
    let (provider, model, health_data_access_enabled) = get_or_create_agent_settings_from_db(&connection)?;
    Ok(build_agent_settings(provider, model, health_data_access_enabled))
}

#[tauri::command]
fn update_agent_settings(input: UpdateAgentSettingsInput) -> Result<AgentSettings, String> {
    let (_info, connection) = open_database()?;
    let (provider, model, health_data_access_enabled) = save_agent_settings_to_db(&connection, input)?;
    Ok(build_agent_settings(provider, model, health_data_access_enabled))
}

#[tauri::command]
fn get_or_create_agent_thread() -> Result<AgentThread, String> {
    let (_info, mut connection) = open_database()?;
    get_or_create_agent_thread_from_db(&mut connection)
}

#[tauri::command]
fn create_agent_thread() -> Result<AgentThread, String> {
    let (_info, mut connection) = open_database()?;
    create_agent_thread_in_db(&mut connection)
}

#[tauri::command]
fn list_agent_threads() -> Result<Vec<AgentThread>, String> {
    let (_info, connection) = open_database()?;
    list_agent_threads_from_db(&connection)
}

#[tauri::command]
fn list_agent_messages(input: AgentThreadInput) -> Result<Vec<AgentMessage>, String> {
    let (_info, connection) = open_database()?;
    list_agent_messages_from_db(&connection, &input.thread_id)
}

#[tauri::command]
fn append_agent_message(input: AppendAgentMessageInput) -> Result<AgentMessage, String> {
    let (_info, connection) = open_database()?;
    append_agent_message_to_db(&connection, input)
}

#[tauri::command]
fn get_agent_session_items(input: AgentSessionItemsInput) -> Result<Vec<JsonValue>, String> {
    let (_info, connection) = open_database()?;
    get_agent_session_items_from_db(&connection, &input.session_id, input.limit)
}

#[tauri::command]
fn add_agent_session_items(input: AddAgentSessionItemsInput) -> Result<(), String> {
    let (_info, mut connection) = open_database()?;
    add_agent_session_items_to_db(&mut connection, input)
}

#[tauri::command]
fn pop_agent_session_item(input: AgentSessionInput) -> Result<Option<JsonValue>, String> {
    let (_info, connection) = open_database()?;
    pop_agent_session_item_from_db(&connection, &input.session_id)
}

#[tauri::command]
fn clear_agent_session_items(input: AgentSessionInput) -> Result<(), String> {
    let (_info, connection) = open_database()?;
    connection
        .execute(
            "DELETE FROM agent_session_items WHERE session_id = ?1",
            params![input.session_id],
        )
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_native_titlebar_metrics_command(app: AppHandle) -> Result<NativeTitlebarMetrics, String> {
    get_native_titlebar_metrics(&app)
}

#[tauri::command]
fn complete_control_request(
    input: CompleteControlRequestInput,
    state: State<'_, ControlBridgeState>,
) -> Result<(), String> {
    let sender = state
        .pending
        .lock()
        .map_err(|_| "Control bridge pending map is unavailable.".to_string())?
        .remove(&input.id)
        .ok_or_else(|| "Control request is no longer pending.".to_string())?;
    sender.send(input.response).map_err(|error| error.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(ControlBridgeState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            let bridge = app.state::<ControlBridgeState>().inner().clone();
            start_control_bridge(handle, bridge)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_agent_session_items,
            agent_provider_fetch,
            append_agent_message,
            clear_agent_session_items,
            complete_control_request,
            create_agent_thread,
            create_xai_voice_client_secret,
            get_agent_provider_config,
            get_agent_settings,
            get_agent_session_items,
            get_desktop_vault_info,
            get_native_titlebar_metrics_command,
            get_or_create_agent_thread,
            list_agent_messages,
            list_agent_threads,
            load_workspace,
            open_external,
            pop_agent_session_item,
            reset_desktop_vault,
            save_workspace,
            update_agent_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running HealthView OS desktop");
}
