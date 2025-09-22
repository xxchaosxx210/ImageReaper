/* content.js — ImageReaper
   Purpose: scan the page for image candidates in DOM order, filter them by host and extension,
   and emit them back to popup or background. Settings are loaded from chrome.storage.local.
*/

/* ---------------------------
   CONFIG
   --------------------------- */
const CONFIG = { ...IMAGE_REAPER_DEFAULTS };

/* ---------------------------
   Utility helpers
   --------------------------- */
function log(...args) {
    if (CONFIG.debug) console.log("[ImageReaper]", ...args);
}

function parseUrl(url) {
    try {
        return new URL(url, location.href);
    } catch {
        return null;
    }
}

function getExtFromUrl(url) {
    if (!url) return null;
    const path = url.split("?")[0].split("#")[0];
    const seg = path.split("/");
    const last = seg[seg.length - 1] || "";
    const dot = last.lastIndexOf(".");
    if (dot === -1) return null;
    return last.slice(dot + 1).toLowerCase();
}

function isHostAllowed(hostname) {
    if (!hostname) return false;

    // whitelist: if non-empty, must match at least one
    if (CONFIG.hostWhitelist.length > 0) {
        const allowed = CONFIG.hostWhitelist.some(pattern =>
            hostname.includes(pattern)
        );
        if (!allowed) return false;
    }

    // blacklist: must NOT match any
    if (CONFIG.hostBlacklist.length > 0) {
        const blocked = CONFIG.hostBlacklist.some(pattern =>
            hostname.includes(pattern)
        );
        if (blocked) return false;
    }

    return true;
}

/* ---------------------------
   Core scanning
   --------------------------- */
function scanPageForImages() {
    const results = [];
    let idx = 0;

    function pushCandidate(rawUrl, element) {
        if (!rawUrl) return;

        const parsed = parseUrl(rawUrl);
        if (!parsed) return;

        const host = parsed.hostname;
        if (!isHostAllowed(host)) return;

        const ext = getExtFromUrl(parsed.href);
        if (!ext || !CONFIG.allowedExts.includes(ext)) return;

        results.push({
            url: parsed.href,
            host,
            ext,
            index: idx++,
            elementTag: element ? element.tagName.toLowerCase() : null,
            pageTitle: document.title || null,
            pageUrl: location.href
        });
    }

    // <img>
    document.querySelectorAll("img[src]").forEach(img => pushCandidate(img.src, img));

    // <a> with direct image links
    document.querySelectorAll("a[href]").forEach(a => {
        const ext = getExtFromUrl(a.href);
        if (ext && CONFIG.allowedExts.includes(ext)) pushCandidate(a.href, a);
    });

    return results;
}

function performScanAndEmit() {
    const candidates = scanPageForImages();
    if (candidates.length === 0) {
        log("No images found.");
    } else {
        log(`Found ${candidates.length} images:`);
        candidates.forEach(item => log(" →", item.url));
    }

    return candidates;
}

/* ---------------------------
   MutationObserver (optional)
   --------------------------- */
let _observer = null;
let _mutationTimer = null;

function startMutationObserverIfNeeded() {
    if (!CONFIG.mutationObserve) return;
    if (_observer) return;

    _observer = new MutationObserver(() => {
        if (_mutationTimer) clearTimeout(_mutationTimer);
        _mutationTimer = setTimeout(() => {
            log("DOM changed — rescanning.");
            performScanAndEmit();
        }, CONFIG.mutationDebounceMs);
    });

    _observer.observe(document.body, { childList: true, subtree: true });
    log("MutationObserver started.");
}

/* ---------------------------
   Expose API for debugging
   --------------------------- */
window.ImageReaper = {
    scan: performScanAndEmit,
    setConfig: (partial) => { Object.assign(CONFIG, partial); log("Config updated:", CONFIG); },
    getConfig: () => JSON.parse(JSON.stringify(CONFIG))
};

/* ---------------------------
   Load saved settings before starting
   --------------------------- */
chrome.storage.local.get(IMAGE_REAPER_DEFAULTS, (items) => {
    Object.assign(CONFIG, items);
    log("Loaded config from storage:", CONFIG);

    if (CONFIG.autoMode) {
        performScanAndEmit();
        if (CONFIG.mutationObserve) startMutationObserverIfNeeded();
    }
});

/* ---------------------------
   Listen for popup messages
   --------------------------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "scanPage") {
        const results = performScanAndEmit();
        sendResponse({ ok: true, count: results.length, items: results });
    }
    return true; // keeps sendResponse async-safe
});
