// results.js

document.addEventListener("DOMContentLoaded", () => {
    const status = document.getElementById("status");
    const resultsList = document.getElementById("resultsList");
    const downloadBtn = document.getElementById("downloadBtn");
    const folderInput = document.getElementById("resultsDownloadFolder");
    const prefixInput = document.getElementById("resultsFilenamePrefix");

    // --- Render links from scan results ---
    function renderResults(items) {
        resultsList.innerHTML = "";
        if (!items || items.length === 0) {
            status.textContent = "No results yet.";
            downloadBtn.disabled = true;
            return;
        }

        status.textContent = `✅ Found ${items.length} links`;
        downloadBtn.disabled = false;

        items.forEach(item => {
            const url = item.url;
            if (!url) return;

            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = url;
            link.textContent = url;
            link.target = "_blank";

            li.dataset.originalUrl = url;
            li.appendChild(link);          // ✅ fixed
            resultsList.appendChild(li);   // ✅ fixed
        });
    }


    // --- Load last scan from storage on page load ---
    chrome.storage.local.get(["downloadFolder", "filenamePrefix", "lastScan"], (data) => {
        folderInput.value = data.downloadFolder || "ImageReaper";
        prefixInput.value = data.filenamePrefix || "";
        renderResults(data.lastScan);
    });

    // --- Save config changes ---
    folderInput.addEventListener("input", () => {
        chrome.storage.local.set({ downloadFolder: folderInput.value });
    });
    prefixInput.addEventListener("input", () => {
        chrome.storage.local.set({ filenamePrefix: prefixInput.value });
    });

    // --- Listen for new scans (if Results tab is already open) ---
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "showResults") {
            renderResults(msg.items);
        }
    });

    // --- Download button handler (resolve on demand) ---
    downloadBtn.addEventListener("click", async () => {
        const folder = folderInput.value.trim() || "ImageReaper";
        const prefix = prefixInput.value.trim();
        const items = Array.from(resultsList.querySelectorAll("li"));
        const total = items.length;

        if (total === 0) {
            status.textContent = "⚠️ No links to download.";
            return;
        }

        status.textContent = `⬇️ Resolving ${total} links...`;

        let resolvedCount = 0;
        for (const li of items) {
            const viewerUrl = li.dataset.originalUrl;
            const directUrl = await resolveLink(viewerUrl); // from hostResolvers.js
            const filename = directUrl.split("/").pop();
            const finalName = prefix + filename;

            // Update list with resolved link
            const link = li.querySelector("a");
            link.href = directUrl;
            link.textContent = directUrl;

            // For now: log the intended download
            console.log("→", folder + "/" + finalName, "from", directUrl);

            resolvedCount++;
            status.textContent = `🔄 Resolved ${resolvedCount}/${total} links...`;
        }

        status.textContent = `✅ Finished resolving ${total} links (see console)`;
    });
});
