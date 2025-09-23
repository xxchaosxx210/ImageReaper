document.addEventListener("DOMContentLoaded", () => {
    const status = document.getElementById("status");
    const resultsList = document.getElementById("resultsList");
    const downloadBtn = document.getElementById("downloadBtn");
    const folderInput = document.getElementById("resultsDownloadFolder");
    const prefixInput = document.getElementById("resultsFilenamePrefix");

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
            li.appendChild(link);
            resultsList.appendChild(li);
        });
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

    // --- Download button handler (still logging for now) ---
    downloadBtn.addEventListener("click", () => {
        const folder = folderInput.value.trim() || "ImageReaper";
        const prefix = prefixInput.value.trim();
        const links = Array.from(resultsList.querySelectorAll("li a")).map(a => a.href);

        if (links.length === 0) {
            status.textContent = "⚠️ No links to download.";
            return;
        }

        status.textContent = `⬇️ Preparing ${links.length} downloads...`;

        // For now: just log the intended filenames
        links.forEach(url => {
            const filename = url.split("/").pop();
            const finalName = prefix + filename;
            console.log("→", folder + "/" + finalName, "from", url);
        });

        status.textContent = `✅ Would download ${links.length} files (see console)`;
    });
});
