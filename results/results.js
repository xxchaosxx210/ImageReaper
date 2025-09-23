document.addEventListener("DOMContentLoaded", () => {
    const status = document.getElementById("status");
    const resultsList = document.getElementById("resultsList");

    function renderResults(items) {
        resultsList.innerHTML = "";
        if (!items || items.length === 0) {
            status.textContent = "No results yet.";
            return;
        }

        status.textContent = `✅ Found ${items.length} links`;

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

    // Listen for live updates (from popup)
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "showResults") {
            renderResults(msg.items);
        }
    });
});
