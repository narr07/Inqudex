use std::{
	collections::HashMap,
	path::{Path, PathBuf},
	process::Stdio,
	sync::Arc,
};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tokio::{
	io::{AsyncBufReadExt, AsyncRead, BufReader},
	process::Command,
	sync::{oneshot, Mutex},
};

#[derive(Default)]
struct Jobs(Arc<Mutex<HashMap<String, oneshot::Sender<()>>>>);

#[derive(Serialize)]
struct ExecResult {
	code: Option<i32>,
	stdout: String,
	stderr: String,
	killed: bool,
}

#[derive(Serialize, Clone)]
struct LogLine {
	id: String,
	stream: &'static str,
	line: String,
}

// npm/bun memasang CLI sebagai shim .cmd di Windows (gis.cmd, lighthouse.cmd). Command::new("gis")
// hanya mencari .exe, jadi PATH ditelusuri manual dengan urutan PATHEXT.
fn resolve_program(program: &str) -> PathBuf {
	if program.contains('/') || program.contains('\\') {
		return PathBuf::from(program);
	}
	let Some(path_var) = std::env::var_os("PATH") else {
		return PathBuf::from(program);
	};
	let exts: &[&str] = if cfg!(windows) { &[".exe", ".cmd", ".bat", ".com"] } else { &[""] };
	for dir in std::env::split_paths(&path_var) {
		for ext in exts {
			let candidate = dir.join(format!("{program}{ext}"));
			if candidate.is_file() {
				return candidate;
			}
		}
	}
	PathBuf::from(program)
}

async fn pump<R: AsyncRead + Unpin>(
	app: AppHandle,
	id: String,
	stream: &'static str,
	reader: R,
	live: bool,
) -> String {
	let mut lines = BufReader::new(reader).lines();
	let mut buf = String::new();
	while let Ok(Some(line)) = lines.next_line().await {
		buf.push_str(&line);
		buf.push('\n');
		if live {
			let _ = app.emit("cli-log", LogLine { id: id.clone(), stream, line });
		}
	}
	buf
}

#[cfg(windows)]
async fn kill_tree(pid: Option<u32>) {
	if let Some(pid) = pid {
		let mut cmd = Command::new("taskkill");
		cmd.args(["/T", "/F", "/PID", &pid.to_string()]);
		cmd.creation_flags(0x0800_0000);
		let _ = cmd.status().await;
	}
}

#[cfg(not(windows))]
async fn kill_tree(_pid: Option<u32>) {}

#[tauri::command]
async fn run_cli(
	app: AppHandle,
	jobs: State<'_, Jobs>,
	id: String,
	program: String,
	args: Vec<String>,
	env: HashMap<String, String>,
	cwd: Option<String>,
	live: bool,
) -> Result<ExecResult, String> {
	let mut cmd = Command::new(resolve_program(&program));
	cmd.args(&args)
		.envs(&env)
		.env("NO_COLOR", "1")
		.env("FORCE_COLOR", "0")
		.stdin(Stdio::null())
		.stdout(Stdio::piped())
		.stderr(Stdio::piped())
		.kill_on_drop(true);
	if let Some(dir) = cwd.filter(|d| !d.is_empty()) {
		cmd.current_dir(dir);
	}
	#[cfg(windows)]
	cmd.creation_flags(0x0800_0000);

	let mut child = cmd
		.spawn()
		.map_err(|e| format!("Tidak bisa menjalankan '{program}': {e}. Pastikan sudah terpasang dan ada di PATH."))?;
	let pid = child.id();

	let (kill_tx, mut kill_rx) = oneshot::channel::<()>();
	jobs.0.lock().await.insert(id.clone(), kill_tx);

	let out = child.stdout.take().ok_or("stdout tidak tersedia")?;
	let err = child.stderr.take().ok_or("stderr tidak tersedia")?;
	let h_out = tokio::spawn(pump(app.clone(), id.clone(), "stdout", out, live));
	let h_err = tokio::spawn(pump(app.clone(), id.clone(), "stderr", err, live));

	let mut killed = false;
	let status = tokio::select! {
		s = child.wait() => s.ok(),
		_ = &mut kill_rx => {
			killed = true;
			kill_tree(pid).await;
			let _ = child.kill().await;
			child.wait().await.ok()
		}
	};

	jobs.0.lock().await.remove(&id);
	let stdout = h_out.await.unwrap_or_default();
	let stderr = h_err.await.unwrap_or_default();
	Ok(ExecResult { code: status.and_then(|s| s.code()), stdout, stderr, killed })
}

#[tauri::command]
async fn cancel_cli(jobs: State<'_, Jobs>, id: String) -> Result<bool, String> {
	if let Some(tx) = jobs.0.lock().await.remove(&id) {
		let _ = tx.send(());
		return Ok(true);
	}
	Ok(false)
}

#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
	std::fs::read_to_string(&path).map_err(|e| format!("Gagal membaca {path}: {e}"))
}

#[tauri::command]
fn write_text(path: String, content: String) -> Result<(), String> {
	if let Some(parent) = Path::new(&path).parent() {
		let _ = std::fs::create_dir_all(parent);
	}
	std::fs::write(&path, content).map_err(|e| format!("Gagal menyimpan {path}: {e}"))
}

#[tauri::command]
fn path_exists(path: String) -> bool {
	Path::new(&path).exists()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.manage(Jobs::default())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_http::init())
		.plugin(tauri_plugin_opener::init())
		.invoke_handler(tauri::generate_handler![run_cli, cancel_cli, read_text, write_text, path_exists])
		.run(tauri::generate_context!())
		.expect("gagal menjalankan SEO Narr");
}
