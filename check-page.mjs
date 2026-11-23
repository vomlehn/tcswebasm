// Checks that the built page starts each example, as GitHub Pages will
// serve it: from a server that sends no isolation headers, so that coi.js,
// the page's service worker, must isolate it first.
//
//   node check-page.mjs [EXAMPLE...]
//
// For each example, every one where none is named, headless Chrome loads
// the page and waits for it to be isolated and for the example's windows
// to be shown and drawn; and it fails where the page throws, or panics, in
// the page or any of its workers. It exits 0 where every example passes,
// and 1 where any fails, saying why. Chrome is the one CHROME names, or
// google-chrome.

import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { setTimeout as sleep } from "node:timers/promises";
import puppeteer from "puppeteer-core";

// The examples, and how many windows each shows when it has started.
const EXAMPLES = {
	thermostat: 3,
	lander: 2,
	beacon: 1,
	tees: 2,
	minimal: 2,
};
// Where the page is served while it is checked.
const PORT = 8123;
// How long an example has to start, and then to keep running without a
// panic, in milliseconds.
const START_MS = 90000;
const RUN_MS = 10000;
// What, said in the console of the page or a worker, is a failure: a Rust
// panic, or WebAssembly stopping.
const FAILED = /panicked at|RuntimeError|unreachable executed/;

/**
 * Starts a file server for web/, sending no isolation headers, as GitHub
 * Pages does not.
 *
 * @return {Promise<import("node:child_process").ChildProcess>}  The
 *         server, once it listens: it says "Serving HTTP on" once it has
 *         bound its port, unbuffered, and exits where it cannot.
 */
function serve() {
	const server = spawn("python3", ["-u", "-m", "http.server", "--bind",
					 "127.0.0.1", "--directory", "web",
					 String(PORT)],
			     { stdio: ["ignore", "pipe", "ignore"] });
	return new Promise((resolve, reject) => {
		const failed = (why) => {
			server.kill();
			reject(new Error(`the file server did not start: ${why}`));
		};
		const timer = setTimeout(() => failed("it said nothing"),
					 10000);
		server.on("exit", (code) => {
			clearTimeout(timer);
			failed(`it exited, ${code}`);
		});
		createInterface({ input: server.stdout }).on("line", (line) => {
			if (line.startsWith("Serving HTTP on")) {
				clearTimeout(timer);
				server.removeAllListeners("exit");
				resolve(server);
			}
		});
	});
}

/**
 * Counts the colours in a picture, up to a limit.
 *
 * @param {import("puppeteer-core").Page} page  A page to count them in.
 * @param {string} png                          The picture, base64 PNG.
 * @return {Promise<number>}  The colours seen, at most 16.
 */
function colours(page, png) {
	return page.evaluate(async (data) => {
		const image = new Image();
		image.src = `data:image/png;base64,${data}`;
		await image.decode();
		const canvas = new OffscreenCanvas(image.width, image.height);
		const context = canvas.getContext("2d");
		context.drawImage(image, 0, 0);
		const pixels = context.getImageData(0, 0, image.width,
						    image.height).data;
		const seen = new Set();
		for (let i = 0; i < pixels.length && seen.size < 16; i += 4) {
			seen.add((pixels[i] << 16) | (pixels[i + 1] << 8) |
				 pixels[i + 2]);
		}
		return seen.size;
	}, png);
}

/**
 * Checks one example.
 *
 * @param {import("puppeteer-core").Browser} browser  Chrome, to load it in.
 * @param {string} name                               The example's name.
 * @param {number} windows                            How many windows it
 *                                                    shows once started.
 * @return {Promise<string[]>}  What is wrong with it: empty where it passes.
 */
async function check(browser, name, windows) {
	const context = await browser.createBrowserContext();
	const page = await context.newPage();
	await page.setViewport({ width: 1400, height: 1000 });
	const wrong = [];
	const heard = (where) => (message) => {
		const text = message.text();
		if (message.type() === "error" || FAILED.test(text)) {
			wrong.push(`${where} said: ${text.slice(0, 400)}`);
		}
	};
	page.on("console", heard("the page"));
	page.on("pageerror", (error) =>
		wrong.push(`the page threw: ${error.message}`));
	page.on("workercreated", (worker) => worker.on("console",
							heard("a worker")));
	try {
		await page.goto(`http://127.0.0.1:${PORT}/?example=${name}`);
		// Isolated, through coi.js's reload, and every window shown at
		// its own size rather than a canvas's default 300 by 150.
		await page.waitForFunction((count) => crossOriginIsolated &&
			[...document.querySelectorAll(".window")]
				.filter((frame) => !frame.hidden &&
					frame.querySelector("canvas")?.width !==
					300).length >= count,
			{ timeout: START_MS, polling: "mutation" }, windows);
		await sleep(RUN_MS);
		const shown = await page.$$(".window:not([hidden]) canvas");
		for (const [index, canvas] of shown.entries()) {
			const png = await canvas.screenshot({ encoding: "base64" });
			if (await colours(page, png) < 3) {
				wrong.push(`window ${index + 1} is not drawn`);
			}
		}
	} catch (error) {
		const state = await page.evaluate(() => ({
			isolated: crossOriginIsolated,
			shown: document.querySelectorAll(".window:not([hidden])")
				.length,
		})).catch(() => null);
		wrong.push(`it did not start: ${error.message}` +
			   (state ? `; isolated ${state.isolated},` +
			    ` ${state.shown} of ${windows} windows shown` : ""));
	}
	await context.close();
	return wrong;
}

/**
 * Checks the examples named on the command line, or all of them.
 *
 * @return {Promise<number>}  0 where every one passes, 1 where any fails.
 */
async function main() {
	const names = process.argv.slice(2);
	for (const name of names) {
		if (!(name in EXAMPLES)) {
			console.error(`check-page: no example ${name}`);
			return 1;
		}
	}
	const chrome = process.env.CHROME ??
		execFileSync("which", ["google-chrome"]).toString().trim();
	const server = await serve();
	// Headless Chrome has no GPU: WebGL is drawn in software, which
	// Chrome now asks to be told is wanted.
	const browser = await puppeteer.launch({
		executablePath: chrome,
		args: ["--enable-unsafe-swiftshader"],
	});
	let failed = 0;
	try {
		for (const name of names.length ? names
						 : Object.keys(EXAMPLES)) {
			const wrong = await check(browser, name,
						  EXAMPLES[name]);
			if (wrong.length) {
				failed = 1;
				console.log(`FAIL ${name}`);
				for (const why of wrong) {
					console.log(`  ${why}`);
				}
			} else {
				console.log(`ok   ${name}`);
			}
		}
	} finally {
		await browser.close();
		server.kill();
	}
	return failed;
}

process.exitCode = await main();
