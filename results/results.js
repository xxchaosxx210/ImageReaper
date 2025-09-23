document.addEventListener("DOMContentLoaded", () => {
    const status = document.getElementById("status");
    const resultsList = document.getElementById("resultsList");
    const downloadBtn = document.getElementById("downloadBtn");

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

    // On load, render last scan from storage
    chrome.storage.local.get("lastScan", (data) => {
        renderResults(data.lastScan);
    });

    // Listen for live updates
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "showResults") {
            renderResults(msg.items);
        }
    });

    // --- Download button handler (stub for now) ---
    downloadBtn.addEventListener("click", () => {
        const links = Array.from(resultsList.querySelectorAll("li a")).map(a => a.href);

        if (links.length === 0) {
            status.textContent = "⚠️ No links to download.";
            return;
        }

        status.textContent = `⬇️ Preparing ${links.length} downloads...`;

        // For now: just log the links
        console.log("Download All triggered for:", links);

        // Later: loop links and call chrome.downloads.download(...)
        status.textContent = `✅ Would download ${links.length} files (see console)`;
    });
});
