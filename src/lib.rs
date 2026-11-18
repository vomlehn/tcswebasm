//! The TCSpecial examples in a web page.
//!
//! What runs on Linux as programs -- tcspecial, and the simulator and ground
//! station beside it -- runs here as programs of the page: each registered
//! by name, started on a thread of its own, and talking to the others over
//! the page's own UDP and TCP, at the addresses the examples' configurations
//! give. See tcsos's `browser` module, which is what makes them programs;
//! this is the page's part: the files the examples read, the programs, and
//! starting them.

use wasm_bindgen::prelude::wasm_bindgen;

/// The examples' files, put where a checkout's root would hold them: the
/// configurations name one another by paths from there.
const FILES: &[(&str, &str)] = &[
    (
        "/examples/thermostat/thermostat.ytcs",
        include_str!("../../tcspecial/examples/thermostat/thermostat.ytcs"),
    ),
    (
        "/examples/thermostat/thermostat-sim.yaml",
        include_str!("../../tcspecial/examples/thermostat/thermostat-sim.yaml"),
    ),
    (
        "/examples/thermostat/thermostat.xtcs",
        include_str!("../../tcspecial/examples/thermostat/thermostat.xtcs"),
    ),
    (
        "/examples/thermostat/thermostat.xtce",
        include_str!("../../tcspecial/examples/thermostat/thermostat.xtce"),
    ),
    (
        "/examples/thermostat-common/thermostat.ytcs",
        include_str!(
            "../../tcspecial/examples/thermostat-common/thermostat.ytcs"
        ),
    ),
    (
        "/examples/thermostat-common/thermostat-sim.yaml",
        include_str!(
            "../../tcspecial/examples/thermostat-common/thermostat-sim.yaml"
        ),
    ),
    (
        "/examples/thermostat-common/thermostat.xtcs",
        include_str!(
            "../../tcspecial/examples/thermostat-common/thermostat.xtcs"
        ),
    ),
];

/// A configuration without its telemetry log: tcslog, which writes it, is
/// built on the standard library's files and clock, which a page has not
/// got, and a log kept in the page's memory would be gone with the page.
///
/// # Arguments
///
/// * `text` - The configuration.
///
/// # Returns
///
/// It, with the `log:` section of its `tcspecial` section taken out.
fn without_log(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut skipping = false;
    for line in text.lines() {
        let indent = line.len() - line.trim_start().len();
        if skipping && (line.trim().is_empty() || indent > 2) {
            continue;
        }
        skipping = indent == 2 && line.trim_start() == "log:";
        if !skipping {
            out.push_str(line);
            out.push('\n');
        }
    }
    out
}

/// Puts the examples' files in the page's file system.
fn preload() {
    for (path, text) in FILES {
        let text = if path.ends_with(".ytcs") {
            without_log(text)
        } else {
            text.to_string()
        };
        tcsos::browser::fs::preload(path, text.as_bytes());
    }
    // Where the examples' telemetry logs go, which tcsx makes afresh before
    // each run on Linux.
    let _ = tcsos::fs::create_dir_all("/tmp/telemetry");
}

/// tcspecial, as the page starts it: its command line, run.
///
/// # Arguments
///
/// * `_args` - Its arguments, which it reads from its program's own.
///
/// # Returns
///
/// Never: tcspecial ends by exiting, which the page takes as its status.
fn tcspecial(_args: Vec<String>) -> i32 {
    tcspecial::command_line::main();
    0
}

/// segsend, which tcspecial hands each filled telemetry log segment to: the
/// one tcspecial ships, which deletes it.
///
/// # Arguments
///
/// * `args` - Its name, and the segment.
///
/// # Returns
///
/// Nought where the segment was deleted, 1 where it could not be, and 2
/// for anything but one segment.
fn segsend(args: Vec<String>) -> i32 {
    let [_, file] = args.as_slice() else {
        log::error!("segsend: give it one file, the filled segment to send");
        return 2;
    };
    match tcsos::fs::remove_file(file) {
        Ok(()) => 0,
        Err(e) => {
            log::error!("segsend: {file} could not be deleted: {e}");
            1
        }
    }
}

/// Listens where the thermostat's beacons are sent, and says each one in
/// the console: a first proof that tcspecial runs and talks.
fn listen() {
    let socket = match tcsos::net::UdpSocket::bind("127.0.0.1:5650") {
        Ok(socket) => socket,
        Err(e) => {
            log::error!("cannot listen for beacons: {e}");
            return;
        }
    };
    let mut buffer = [0u8; 2048];
    loop {
        match socket.recv_from(&mut buffer) {
            Ok((got, from)) => log::info!(
                "beacon from {from}: {got} bytes: {}",
                String::from_utf8_lossy(&buffer[..got.min(120)])
            ),
            Err(e) => {
                log::error!("listening for beacons failed: {e}");
                return;
            }
        }
    }
}

/// Starts the page: the files, the programs, and the thermostat's vehicle.
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
    let _ = console_log::init_with_level(log::Level::Info);
    preload();
    tcsos::process::register("tcspecial", tcspecial);
    tcsos::process::register("segsend", segsend);
    tcsos::thread::spawn(listen);
    let started = tcsos::process::Command::new("/bin/tcspecial")
        .args([
            "--simulate=all",
            "--no-memlock",
            "/examples/thermostat/thermostat.ytcs",
        ])
        .current_dir("/")
        .spawn();
    match started {
        Ok(child) => log::info!("tcspecial started, program {}", child.id()),
        Err(e) => log::error!("tcspecial could not be started: {e}"),
    }
}
