// defaults.js — ImageReaper
// Centralized defaults for content.js, options.js, and popup.js

const IMAGE_REAPER_DEFAULTS = {
    hostWhitelist: [
        "imagebam.com",
        "imagevenue.com",
        "pixhost.to",
        "imgbox.com",
        "pimpandhost.com"
    ],
    hostBlacklist: [],
    allowedExts: ["jpg", "jpeg"],
    debug: true,
    mutationObserve: false,
    mutationDebounceMs: 400,
    autoMode: false // New: only auto-scan when enabled
};

// Expose to other scripts
if (typeof window !== "undefined") {
    window.IMAGE_REAPER_DEFAULTS = IMAGE_REAPER_DEFAULTS;
}
if (typeof globalThis !== "undefined") {
    globalThis.IMAGE_REAPER_DEFAULTS = IMAGE_REAPER_DEFAULTS;
}
