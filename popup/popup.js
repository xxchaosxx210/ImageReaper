document.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById("scanBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const autoMode = document.getElementById("autoMode");
    const showThumbs = document.getElementById("showThumbs");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const status = document.getElementById("status");

    // --- Scan button ---
    scanBtn.addEventListener("click", () => {
        status.textContent = "🔍 Scanning page...";

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(
                tabs[0].id,
                { action: "scanPage" },
                (response) => {
                    if (chrome.runtime.lastError) {
                        status.textContent = "❌ Could not scan this page.";
                        console.error("Scan error:", chrome.runtime.lastError.message);
                        return;
                    }

                    if (response && response.ok) {
                        progressBar.style.width = "100%";
                        progressText.textContent = `${response.count} links found`;
                        status.textContent = "✅ Scan complete";

                        // Save results into storage
                        chrome.storage.local.set({ lastScan: response.items }, () => {

                            const resultsUrl = chrome.runtime.getURL("results/results.html");

                            // Check if results page is already open
                            chrome.tabs.query({}, (allTabs) => {
                                const existingTab = allTabs.find(t => t.url === resultsUrl);
                                if (existingTab) {
                                    chrome.tabs.update(existingTab.id, { active: true });
                                } else {
                                    chrome.tabs.create({ url: resultsUrl });
                                }
                            });
                        });
                    } else {
                        status.textContent = "❌ No response from content script.";
                    }
                }
            );
        });
    });

    // --- Download button (still a stub for now) ---
    downloadBtn.addEventListener("click", () => {
        status.textContent = "⬇️ Download feature coming soon...";
        console.log("Download button clicked (to be implemented)");
    });

    // --- Auto Mode toggle ---
    autoMode.addEventListener("change", () => {
        chrome.storage.local.set({ autoMode: autoMode.checked }, () => {
            console.log("Auto Mode set to", autoMode.checked);
        });
    });

    // --- Show Thumbnails toggle ---
    showThumbs.addEventListener("change", () => {
        console.log("Show Thumbnails:", showThumbs.checked);
    });

    // --- Load saved settings into popup controls ---
    chrome.storage.local.get(["autoMode"], (items) => {
        autoMode.checked = items.autoMode || false;
    });
});
