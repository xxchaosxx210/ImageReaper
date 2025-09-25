// options.js

// Default settings (keep in sync with content.js and defaults.js)
const DEFAULTS = {
    hostWhitelist: ["imagebam.com", "imagevenue.com", "pixhost.to", "imgbox.com", "pimpandhost.com"],
    hostBlacklist: [],
    allowedExts: ["jpg", "jpeg"],
    debug: true,
    mutationObserve: false,
    mutationDebounceMs: 400,

    // NEW
    downloadFolder: "ImageReaper",
    filenamePrefix: ""
};

function loadOptions() {
    chrome.storage.local.get(DEFAULTS, (items) => {
        document.getElementById("whitelist").value = (items.hostWhitelist || []).join("\n");
        document.getElementById("blacklist").value = (items.hostBlacklist || []).join("\n");
        document.getElementById("exts").value = (items.allowedExts || []).join(", ");
        document.getElementById("debug").checked = !!items.debug;
        document.getElementById("mutationObserve").checked = !!items.mutationObserve;
        document.getElementById("debounce").value = items.mutationDebounceMs;

        // NEW fields
        document.getElementById("downloadFolder").value = items.downloadFolder || DEFAULTS.downloadFolder;
        document.getElementById("filenamePrefix").value = items.filenamePrefix || DEFAULTS.filenamePrefix;
    });
}

function saveOptions() {
    const whitelist = document.getElementById("whitelist").value
        .split("\n").map(s => s.trim()).filter(Boolean);

    const blacklist = document.getElementById("blacklist").value
        .split("\n").map(s => s.trim()).filter(Boolean);

    const exts = document.getElementById("exts").value
        .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

    const debug = document.getElementById("debug").checked;
    const mutationObserve = document.getElementById("mutationObserve").checked;
    const debounce = parseInt(document.getElementById("debounce").value, 10) || DEFAULTS.mutationDebounceMs;

    // NEW fields
    const downloadFolder = document.getElementById("downloadFolder").value.trim()
        .replace(/\\/g, "/")  // normalize backslashes to forward slashes
        || DEFAULTS.downloadFolder;

    const filenamePrefix = document.getElementById("filenamePrefix").value.trim();

    chrome.storage.local.set({
        hostWhitelist: whitelist,
        hostBlacklist: blacklist,
        allowedExts: exts,
        debug,
        mutationObserve,
        mutationDebounceMs: debounce,

        // NEW
        downloadFolder,
        filenamePrefix
    }, () => {
        const status = document.getElementById("status");
        status.textContent = "Options saved.";
        setTimeout(() => { status.textContent = ""; }, 1500);
        loadOptions(); // reload for clean view
    });
}

function resetOptions() {
    chrome.storage.local.set(DEFAULTS, loadOptions);
}

document.addEventListener("DOMContentLoaded", () => {
    loadOptions();
    document.getElementById("save").addEventListener("click", saveOptions);
    document.getElementById("reset").addEventListener("click", resetOptions);

    // Handle chrome://settings link (copy to clipboard)
    const settingsLink = document.getElementById("openSettings");
    const copiedMsg = document.getElementById("copiedMsg");

    if (settingsLink) {
        settingsLink.addEventListener("click", (e) => {
            e.preventDefault();
            navigator.clipboard.writeText("chrome://settings/downloads").then(() => {
                copiedMsg.style.display = "inline";
                setTimeout(() => { copiedMsg.style.display = "none"; }, 2000);
            });
        });
    }
});
