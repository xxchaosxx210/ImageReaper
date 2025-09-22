// Default settings (keep in sync with content.js)
const DEFAULTS = {
    hostWhitelist: ["imagebam.com", "imagevenue.com", "pixhost.to", "imgbox.com", "pimpandhost.com"],
    hostBlacklist: [],
    allowedExts: ["jpg", "jpeg"],
    debug: true,
    mutationObserve: false,
    mutationDebounceMs: 400
};

function loadOptions() {
    chrome.storage.local.get(DEFAULTS, (items) => {
        document.getElementById("whitelist").value = (items.hostWhitelist || []).join("\n");
        document.getElementById("blacklist").value = (items.hostBlacklist || []).join("\n");
        document.getElementById("exts").value = (items.allowedExts || []).join(", ");
        document.getElementById("debug").checked = !!items.debug;
        document.getElementById("mutationObserve").checked = !!items.mutationObserve;
        document.getElementById("debounce").value = items.mutationDebounceMs;
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

    chrome.storage.local.set({
        hostWhitelist: whitelist,
        hostBlacklist: blacklist,
        allowedExts: exts,
        debug,
        mutationObserve,
        mutationDebounceMs: debounce
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
});
