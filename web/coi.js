// Makes the page cross-origin isolated where its server will not.
//
// The page's WebAssembly shares memory between its threads, which a browser
// allows only in a page served with two headers, Cross-Origin-Opener-Policy
// and Cross-Origin-Embedder-Policy. serve.py sends them; GitHub Pages cannot.
// So this file is two things. Loaded by the page, it installs itself as the
// page's service worker and loads the page again, once, through it. Run as
// that service worker, it adds the two headers to everything the page and
// its workers fetch.

if (typeof window === "undefined") {
	self.addEventListener("install", () => self.skipWaiting());
	self.addEventListener("activate", (event) =>
		event.waitUntil(self.clients.claim()));
	self.addEventListener("fetch", isolate);
} else {
	becomeIsolated();
}

/**
 * Answers a fetch with what the server answered, plus the headers that
 * isolate the page.
 *
 * @param {FetchEvent} event  What the page or a worker fetched.
 */
function isolate(event) {
	const request = event.request;
	// Which a browser refuses for another site; left to it.
	if (request.cache === "only-if-cached" &&
	    request.mode !== "same-origin") {
		return;
	}
	event.respondWith(fetch(request).then((response) => {
		// Opaque, from another site: nothing to add to.
		if (response.status === 0) {
			return response;
		}
		const headers = new Headers(response.headers);
		headers.set("Cross-Origin-Opener-Policy", "same-origin");
		headers.set("Cross-Origin-Embedder-Policy", "require-corp");
		headers.set("Cross-Origin-Resource-Policy", "cross-origin");
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: headers,
		});
	}));
}

/**
 * In the page: where it is not yet isolated, installs this file as its
 * service worker and loads the page again through it, once a session, so
 * that a browser that will not isolate it is not asked forever.
 */
function becomeIsolated() {
	const RELOADED = "coi-reloaded";
	if (window.crossOriginIsolated) {
		sessionStorageSet(RELOADED, null);
		return;
	}
	if (!window.isSecureContext || !("serviceWorker" in navigator)) {
		return;
	}
	navigator.serviceWorker.register(document.currentScript.src)
		.then(() => navigator.serviceWorker.ready)
		.then(() => {
			if (sessionStorageGet(RELOADED) === null &&
			    sessionStorageSet(RELOADED, "1")) {
				window.location.reload();
			}
		})
		.catch((error) => console.error("coi.js:", error));
}

/**
 * Reads a value this session keeps, where the browser lets it.
 *
 * @param {string} key  Its name.
 * @return {?string} The value, or null where there is none or the browser
 *                   keeps none.
 */
function sessionStorageGet(key) {
	try {
		return window.sessionStorage.getItem(key);
	} catch (error) {
		return null;
	}
}

/**
 * Keeps a value for this session, where the browser lets it.
 *
 * @param {string} key      Its name.
 * @param {?string} value   The value, or null to forget it.
 * @return {boolean} Whether the browser kept it: where it keeps nothing, the
 *                   page is not loaded again, which would never end.
 */
function sessionStorageSet(key, value) {
	try {
		if (value === null) {
			window.sessionStorage.removeItem(key);
		} else {
			window.sessionStorage.setItem(key, value);
		}
		return true;
	} catch (error) {
		return false;
	}
}
