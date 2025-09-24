document.addEventListener("DOMContentLoaded", () => {
    const status = document.getElementById("status");
    const resultsList = document.getElementById("resultsList");
    const downloadBtn = document.getElementById("downloadBtn");
    const folderInput = document.getElementById("resultsDownloadFolder");
    const prefixInput = document.getElementById("resultsFilenamePrefix");

    // --- Render viewer links initially ---
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
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = item.url;
            link.textContent = item.url;
            link.target = "_blank";
            li.dataset.originalUrl = item.url; // store viewer link
            li.dataset.resolved = "false";     // mark unresolved
            li.appendChild(link);
            resultsList.appendChild(li);
        });

        // Start resolving in background
        progressivelyResolve();
    }

    // --- Resolve viewer links one by one with progress updates ---
    async function progressivelyResolve() {
        const items = Array.from(resultsList.querySelectorAll("li"));
        const total = items.length;
        let resolvedCount = 0;

        for (const li of items) {
            if (li.dataset.resolved === "true") continue; // skip already resolved

            const url = li.dataset.originalUrl;
            const directUrl = await resolveLink(url); // from hostResolvers.js
            li.dataset.resolved = "true";

            // Replace link with direct image URL
            const link = li.querySelector("a");
            link.href = directUrl;
            link.textContent = directUrl;

            // Update progress
            resolvedCount++;
            status.textContent = `🔄 Resolving ${resolvedCount}/${total} links...`;
        }

        status.textContent = `✅ All ${total} links resolved`;
    }

    // --- Load saved config on startup ---
    chrome.storage.local.get(["downloadFolder", "filenamePrefix", "lastScan"], (data) => {
        folderInput.value = data.downloadFolder || "ImageReaper";
        prefixInput.value = data.filenamePrefix || "";
        renderResults(data.lastScan);
    });

    // --- Save config on change ---
    folderInput.addEventListener("input", () => {
        chrome.storage.local.set({ downloadFolder: folderInput.value });
    });
    prefixInput.addEventListener("input", () => {
        chrome.storage.local.set({ filenamePrefix: prefixInput.value });
    });

    // --- Listen for new scans ---
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "showResults") {
            renderResults(msg.items);
        }
    });

    // --- Download button handler ---
    downloadBtn.addEventListener("click", async () => {
        const folder = folderInput.value.trim() || "ImageReaper";
        const prefix = prefixInput.value.trim();
        const links = Array.from(resultsList.querySelectorAll("li a")).map(a => a.href);

        if (links.length === 0) {
            status.textContent = "⚠️ No links to download.";
            return;
        }

        status.textContent = `⬇️ Preparing ${links.length} downloads...`;

        for (const url of links) {
            const filename = url.split("/").pop();
            const finalName = prefix + filename;

            // For now: just log the intended download
            console.log("→", folder + "/" + finalName, "from", url);
        }

        status.textContent = `✅ Would download ${links.length} files (see console)`;
    });
});
