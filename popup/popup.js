document.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById("scanBtn");
    const autoMode = document.getElementById("autoMode");
    const showThumbs = document.getElementById("showThumbs");

    // --- Scan button ---
    scanBtn.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(
                tabs[0].id,
                { action: "scanPage" },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Scan error:", chrome.runtime.lastError.message);
                        return;
                    }

                    if (response && response.ok) {
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
                        console.warn("❌ No response from content script.");
                    }
                }
            );
        });
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
