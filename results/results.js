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
            resultsList.appendChild(li);
            li.appendChild(link);
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

    // Helper: pad numbers with leading zeros to preserve order (001, 002, …)
    function padIndex(num, total) {
        const width = String(total).length;
        return String(num + 1).padStart(width, "0");
    }

    // --- Download button handler with concurrency + ordered filenames ---
    downloadBtn.addEventListener("click", async () => {
        const folder = folderInput.value.trim() || "ImageReaper";
        const prefix = prefixInput.value.trim();
        const items = Array.from(resultsList.querySelectorAll("li"));
        const total = items.length;

        if (total === 0) {
            status.textContent = "⚠️ No links to download.";
            return;
        }

        status.textContent = `⬇️ Starting download of ${total} links...`;

        // keep original order by carrying the index with each item
        const queue = items.map((li, idx) => ({ li, idx }));
        let active = 0;
        let completed = 0;
        const maxConcurrency = 8;

        async function worker() {
            if (queue.length === 0) {
                if (active === 0) {
                    status.textContent = `✅ All ${total} downloads complete.`;
                }
                return;
            }

            const { li, idx } = queue.shift();
            const viewerUrl = li.dataset.originalUrl;
            active++;

            try {
                const directUrl = await resolveLink(viewerUrl); // from hostResolvers.js
                if (directUrl) {
                    // Prefix filenames with an index to enforce display order
                    const number = padIndex(idx, total);
                    const savePath = buildSavePath(directUrl, folder, `${prefix}${number}_`);

                    await new Promise((resolve, reject) => {
                        chrome.downloads.download({ url: directUrl, filename: savePath }, downloadId => {
                            if (chrome.runtime.lastError || !downloadId) {
                                reject(chrome.runtime.lastError?.message || "Download failed");
                            } else {
                                resolve(downloadId);
                            }
                        });
                    });

                    li.classList.add("success");
                    li.innerHTML = `<a href="${directUrl}" target="_blank">${directUrl}</a> ✅`;
                } else {
                    li.classList.add("failed");
                    li.innerHTML += ` <span style="color:red">⚠️ Failed to resolve</span>`;
                }
            } catch (err) {
                li.classList.add("failed");
                li.innerHTML += ` <span style="color:red">⚠️ ${err}</span>`;
                console.warn("❌ Download error:", viewerUrl, err);
            } finally {
                active--;
                completed++;
                status.textContent = `🔄 Downloaded ${completed}/${total}`;
                worker(); // pick up next job
            }
        }

        // Launch up to maxConcurrency workers
        for (let i = 0; i < Math.min(maxConcurrency, total); i++) {
            worker();
        }
    });
});

// --- Helper to build safe filenames and paths ---
// Sanitize names to be Windows-friendly
function sanitizeWindows(name) {
    name = name.replace(/[<>:"/\\|?*]+/g, "_");
    name = name.replace(/[. ]+$/, "");
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (reserved.test(name)) {
        name = "_" + name;
    }
    return name || "file";
}

function buildSavePath(directUrl, folder, prefix) {
    try {
        const urlObj = new URL(directUrl);
        let filename = urlObj.pathname.split("/").pop() || "image";

        filename = filename.split("?")[0];
        filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

        if (!/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(filename)) {
            filename += ".jpg";
        }

        if (prefix) {
            filename = prefix + filename;
        }

        folder = sanitizeWindows(folder);
        filename = sanitizeWindows(filename);

        let path = folder ? folder.replace(/[\\/]+$/, "") + "/" + filename : filename;
        return path;
    } catch (e) {
        console.warn("buildSavePath failed for", directUrl, e);
        return (prefix || "") + "image.jpg";
    }
}
