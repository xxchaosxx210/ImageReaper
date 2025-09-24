// background.js

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "setImageBamCookie") {
        chrome.cookies.set({
            url: "https://www.imagebam.com/",
            name: "nsfw_inter",
            value: "1",
            domain: ".imagebam.com",
            path: "/"
        }, (cookie) => {
            if (chrome.runtime.lastError) {
                console.error("Cookie set failed:", chrome.runtime.lastError);
                sendResponse({ ok: false, error: chrome.runtime.lastError.message });
            } else {
                console.log("✅ ImageBam cookie set:", cookie);
                sendResponse({ ok: true });
            }
        });

        return true; // ✅ keeps the sendResponse channel open (async)
    }
});
