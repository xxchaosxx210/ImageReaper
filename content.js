/* content.js — ImageReaper
   Purpose: scan the current page for image candidates (in DOM order),
   filter them by host / extension, and emit a concise batch to the extension
   (background/service worker) for downloading.

   Notes:
   - This file intentionally performs no cross-origin fetches or downloads.
   - It builds a list of { url, host, ext, index, originPageTitle, elementHref? }
     so the background can handle referer-sensitive hosts or follow-ups.
*/

/* ---------------------------
   Developer settings (edit as needed)
   --------------------------- */
const CONFIG = {
    // Enable logs to console (set false to silence)
    debug: true,

    // Whether to observe DOM mutations and re-scan newly added nodes.
    mutationObserve: false,

    // Debounce time (ms) for re-scans when MutationObserver fires
    mutationDebounceMs: 400,

    // Simple host filters — empty arrays mean "allow all" by default.
    // Hostnames are matched using substring or exact match logic below.
    hostWhitelist: ["imagebam.com", "imagevenue.com", "pixhost.to", "imgbox.com", "pimpandhost.com"],
    hostBlacklist: [], // e.g. ["example.com"]

    // Allowed file extensions (lowercase, no dot).
    allowedExts: ["jpg", "jpeg"],


    // Whether to include images that are data URLs (data:) — usually skip these.
    includeDataUrls: false,

    // If true, also treat <a> links ending in image ext as image candidates.
    includeLinkedImages: true
};

/* ---------------------------
   Utility helpers
   --------------------------- */

/** Safe logger */
function log(...args) {
    if (CONFIG.debug) console.log("[ImageReaper content]", ...args);
}

/** Normalize URL and return an anchor element for parsing */
function parseUrl(url) {
    try {
        return new URL(url, location.href);
    } catch (e) {
        return null;
    }
}

/** Extract host (hostname) from a URL object or string, or null */
function getHostFromUrl(u) {
    const parsed = typeof u === "string" ? parseUrl(u) : u;
    return parsed ? parsed.hostname : null;
}

/** Get file extension from a url string (lowercase, without dot). */
function getExtFromUrl(url) {
    if (!url) return null;
    // strip query/hash
    const path = url.split("?")[0].split("#")[0];
    const seg = path.split("/");
    const last = seg[seg.length - 1] || "";
    const dot = last.lastIndexOf(".");
    if (dot === -1) return null;
    return last.slice(dot + 1).toLowerCase();
}

/** Simple host allow/deny check */
function isHostAllowed(hostname) {
    if (!hostname) return false;

    // if there's a whitelist, require membership
    if (CONFIG.hostWhitelist.length > 0) {
        const allowed = CONFIG.hostWhitelist.some((pattern) =>
            hostname.includes(pattern)
        );
        if (!allowed) return false;
    }

    // check blacklist
    if (CONFIG.hostBlacklist.length > 0) {
        const blocked = CONFIG.hostBlacklist.some((pattern) =>
            hostname.includes(pattern)
        );
        if (blocked) return false;
    }

    return true;
}

/* ---------------------------
   Core scanning logic
   --------------------------- */

/**
 * Gather image candidates in DOM order.
 * Returned array elements:
 *  { url, host, ext, index, elementTag, elementHref, pageTitle, pageUrl, naturalWidth?, naturalHeight? }
 */
function scanPageForImages() {
    const results = [];
    let idx = 0;

    // Helper to add a candidate if it passes filters
    function pushCandidate(rawUrl, element) {
        if (!rawUrl) return;
        if (!CONFIG.includeDataUrls && rawUrl.startsWith("data:")) return;

        const parsed = parseUrl(rawUrl);
        if (!parsed) return;

        const host = parsed.hostname;
        if (!isHostAllowed(host)) return;

        const ext = getExtFromUrl(parsed.href);
        if (ext && CONFIG.allowedExts.length > 0) {
            if (!CONFIG.allowedExts.includes(ext)) return;
        } else if (!ext) {
            // no extension — skip for now (could be HTML pages or dynamic images)
            return;
        }

        const candidate = {
            url: parsed.href,
            host,
            ext,
            index: idx++,
            elementTag: element ? element.tagName.toLowerCase() : null,
            elementHref: element && element.href ? element.href : null, // e.g., <a> wrapping an <img>
            pageTitle: document.title || null,
            pageUrl: location.href,
            naturalWidth: element && element.naturalWidth ? element.naturalWidth : null,
            naturalHeight: element && element.naturalHeight ? element.naturalHeight : null
        };

        results.push(candidate);
    }

    // 1) Direct <img src=...> elements in DOM order
    const imgs = Array.from(document.querySelectorAll("img[src]"));
    for (const img of imgs) {
        pushCandidate(img.src, img);
    }

    // 2) <source srcset> inside <picture> or <video> (take first candidate from srcset)
    const sources = Array.from(document.querySelectorAll("source[srcset]"));
    for (const s of sources) {
        // srcset can have multiple comma-separated urls — pick the first token's URL
        const srcset = s.getAttribute("srcset").split(",")[0].trim().split(" ")[0];
        pushCandidate(srcset, s);
    }

    // 3) Anchors that link directly to images (optional)
    if (CONFIG.includeLinkedImages) {
        const anchors = Array.from(document.querySelectorAll("a[href]"));
        for (const a of anchors) {
            const href = a.href;
            const ext = getExtFromUrl(href);
            if (ext && CONFIG.allowedExts.includes(ext)) {
                pushCandidate(href, a);
            }
        }
    }

    // 4) Background-image in inline styles — look for elements with style background-image
    // This is heavier, so we use a compact selector.
    const bgElems = Array.from(document.querySelectorAll("[style*='background']"));
    for (const el of bgElems) {
        const style = el.style.backgroundImage || "";
        // pattern: url("...") or url(...)
        const m = /url\((['"]?)(.+?)\1\)/.exec(style);
        if (m && m[2]) {
            pushCandidate(m[2], el);
        }
    }

    return results;
}

/* ---------------------------
   Emitting the scan result
   --------------------------- */

/** Send the candidate batch to the extension (background) */
function emitCandidates(candidates) {
    if (!candidates || candidates.length === 0) {
        log("No image candidates found on page.");
        return;
    }

    // Shape a compact payload - background can expand as needed
    const payload = {
        source: "image-reaper-content",
        timestamp: Date.now(),
        pageUrl: location.href,
        pageTitle: document.title,
        count: candidates.length,
        items: candidates.map((c) => ({
            url: c.url,
            host: c.host,
            ext: c.ext,
            index: c.index,
            elementTag: c.elementTag,
            elementHref: c.elementHref
        }))
    };

    log("Found image candidates:", payload);

    // Two ways to emit:
    // 1) chrome.runtime.sendMessage (preferred when you have a background listener)
    // 2) window.postMessage — useful for debugging or in-page consumers
    try {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(payload, (response) => {
                // safe callback — response may be undefined if no listener exists
                if (chrome.runtime.lastError) {
                    // e.g., "Could not establish connection. Receiving end does not exist."
                    log("chrome.runtime.sendMessage error:", chrome.runtime.lastError.message);
                } else {
                    log("Background response (if any):", response);
                }
            });
        } else {
            // fallback: postMessage to page
            window.postMessage(payload, "*");
        }
    } catch (e) {
        // runtime not available (very old browsers) — just log
        log("Could not send message to background:", e && e.message);
    }
}

/* ---------------------------
   Public API & initialization
   --------------------------- */

/** Do a one-off scan and emit results */
function performScanAndEmit() {
    try {
        const candidates = scanPageForImages();
        emitCandidates(candidates);
    } catch (e) {
        log("Scan failed:", e && e.message);
    }
}

/* Optionally observe DOM mutations and re-scan */
let _mutationTimer = null;
let _observer = null;

function startMutationObserverIfNeeded() {
    if (!CONFIG.mutationObserve) return;

    const observer = new MutationObserver((mutations) => {
        // debounced re-scan (a light approach for dynamic pages)
        if (_mutationTimer) clearTimeout(_mutationTimer);
        _mutationTimer = setTimeout(() => {
            log("MutationObserver triggered — re-scanning for images.");
            performScanAndEmit();
        }, CONFIG.mutationDebounceMs);
    });

    observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });

    _observer = observer;
    log("MutationObserver started.");
}

function stopMutationObserver() {
    if (_observer) {
        _observer.disconnect();
        _observer = null;
        log("MutationObserver stopped.");
    }
}

/* Expose a minimal in-page API so you can call from the console */
window.ImageReaper = {
    scan: performScanAndEmit,
    startWatching: () => {
        CONFIG.mutationObserve = true;
        startMutationObserverIfNeeded();
    },
    stopWatching: () => {
        CONFIG.mutationObserve = false;
        stopMutationObserver();
    },
    setConfig: (partial) => {
        Object.assign(CONFIG, partial || {});
        log("Config updated:", CONFIG);
    },
    getConfig: () => JSON.parse(JSON.stringify(CONFIG))
};

/* Auto-run initial scan (document_idle mode in manifest ensures DOM usually ready) */
performScanAndEmit();
startMutationObserverIfNeeded();
