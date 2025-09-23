document.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById("scanBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const autoMode = document.getElementById("autoMode");
    const showThumbs = document.getElementById("showThumbs");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const status = document.getElementById("status");
    const resultsList = document.getElementById("resultsList");

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
                        progressText.textContent = `${response.count} images found`;
                        status.textContent = "✅ Scan complete";
                        downloadBtn.disabled = response.count === 0;

                        // Log results to popup console
                        console.log(`Found ${response.count} images:`);
                        response.items.forEach(item => console.log(" →", item.url));

                        // Display results in popup
                        resultsList.innerHTML = ""; // clear old results
                        response.items.forEach(item => {
                            const li = document.createElement("li");
                            const link = document.createElement("a");
                            link.href = item.url;
                            link.textContent = item.url;
                            link.target = "_blank"; // open in new tab
                            li.appendChild(link);
                            resultsList.appendChild(li);
                        });
                    } else {
                        status.textContent = "❌ No response from content script.";
                    }
                }
            );
        });
    });

    // --- Download button (not fully implemented yet) ---
    downloadBtn.addEventListener("click", () => {
        const folder = document.getElementById("popupDownloadFolder").value.trim() || "ImageReaper";
        const prefix = document.getElementById("popupFilenamePrefix").value.trim();

        window.alert(`Download path: ${folder}\nPrefix: ${prefix}`);
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

    // --- Load the Saved Folder Path and Prefix
    chrome.storage.local.get(["downloadFolder", "filenamePrefix"], (items) => {
        document.getElementById("popupDownloadFolder").value = items.downloadFolder || "ImageReaper";
        document.getElementById("popupFilenamePrefix").value = items.filenamePrefix || "";
    });

});
