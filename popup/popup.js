document.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById("scanBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const autoMode = document.getElementById("autoMode");
    const showThumbs = document.getElementById("showThumbs");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const status = document.getElementById("status");

    let foundImages = 0;

    // Simulate scanning
    scanBtn.addEventListener("click", () => {
        status.textContent = "🔍 Scanning page...";
        foundImages = Math.floor(Math.random() * 50) + 1; // fake number of images
        setTimeout(() => {
            progressBar.style.width = "100%";
            progressText.textContent = `${foundImages} images found`;
            downloadBtn.disabled = false;
            status.textContent = "✅ Scan complete";
        }, 1000);
    });

    // Simulate download
    downloadBtn.addEventListener("click", () => {
        status.textContent = "⬇️ Downloading...";
        let downloaded = 0;
        const interval = setInterval(() => {
            downloaded++;
            const percent = Math.floor((downloaded / foundImages) * 100);
            progressBar.style.width = percent + "%";
            progressText.textContent = `${downloaded} / ${foundImages} downloaded`;

            if (downloaded >= foundImages) {
                clearInterval(interval);
                status.textContent = "✅ Download complete!";
            }
        }, 100);
    });

    // Auto Mode toggle
    autoMode.addEventListener("change", () => {
        console.log("Auto Mode:", autoMode.checked);
    });

    // Thumbnails toggle
    showThumbs.addEventListener("change", () => {
        console.log("Show Thumbnails:", showThumbs.checked);
    });
});
