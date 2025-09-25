// hostResolvers.js
// Central place for all host-specific resolvers

// --- Debug logger helpers ---
let DEBUG = true; // default; will be overwritten by stored settings

chrome.storage.local.get({ debug: true }, (items) => {
    DEBUG = !!items.debug;
});

function logDebug(...args) {
    if (DEBUG) console.log(...args);
}
function logWarn(...args) {
    if (DEBUG) console.warn(...args);
}
function logError(...args) {
    if (DEBUG) console.error(...args);
}

const hostResolvers = {
    // --- Pixhost ---
    "pixhost.to": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Pixhost HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("#image") || doc.querySelector("img#show_image");
            if (img && img.src) {
                return new URL(img.src, url).href;
            }

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) {
                return new URL(og.content, url).href;
            }

            logWarn("Pixhost resolver failed:", url);
            return null;
        } catch (err) {
            logError("Pixhost resolver error:", err);
            return null;
        }
    },

    // --- ImageBam ---
    "imagebam.com": async (url) => {
        async function fetchDoc(u) {
            try {
                const res = await fetch(u);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const html = await res.text();
                return new DOMParser().parseFromString(html, "text/html");
            } catch (err) {
                logWarn("ImageBam fetch failed:", err);
                return null;
            }
        }

        async function setCookieSafe() {
            return new Promise((resolve) => {
                let done = false;
                const timer = setTimeout(() => {
                    if (!done) {
                        logWarn("ImageBam cookie request timed out");
                        resolve(false);
                    }
                }, 3000);

                chrome.runtime.sendMessage({ action: "setImageBamCookie" }, (response) => {
                    done = true;
                    clearTimeout(timer);
                    resolve(response && response.ok);
                });
            });
        }

        let attempts = 0;
        let doc = await fetchDoc(url);
        if (!doc) return null;

        while (attempts < 2) {
            attempts++;

            const continueLink = doc.querySelector("#continue a[data-shown='inter']");
            if (continueLink && continueLink.href) {
                logDebug("🔎 ImageBam interstitial detected, setting cookie...");
                await setCookieSafe();
                doc = await fetchDoc(continueLink.href);
                if (!doc) return null;
            }

            let img =
                doc.querySelector("#imageContainer img") ||
                doc.querySelector(".main-image") ||
                doc.querySelector("img#mainImage");

            if (img && img.src) {
                return new URL(img.src, url).href;
            }

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) {
                return new URL(og.content, url).href;
            }
        }

        logWarn("⚠️ ImageBam resolver failed after retries:", url);
        return null;
    },

    // --- ImageVenue ---
    "imagevenue.com": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`ImageVenue HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("img#img");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("ImageVenue resolver failed:", url);
            return null;
        } catch (err) {
            logError("ImageVenue resolver error:", err);
            return null;
        }
    },

    // --- ImgBox ---
    "imgbox.com": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`ImgBox HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector(".img-content img");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("ImgBox resolver failed:", url);
            return null;
        } catch (err) {
            logError("ImgBox resolver error:", err);
            return null;
        }
    },

    // --- PimpAndHost ---
    "pimpandhost.com": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`PimpAndHost HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("PimpAndHost resolver failed:", url);
            return null;
        } catch (err) {
            logError("PimpAndHost resolver error:", err);
            return null;
        }
    },

    // --- PostImage ---
    "postimg.cc": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`PostImage HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("img#main-image");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("PostImage resolver failed:", url);
            return null;
        } catch (err) {
            logError("PostImage resolver error:", err);
            return null;
        }
    },

    // --- TurboImageHost ---
    "turboimagehost.com": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`TurboImageHost HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("img.pic");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("TurboImageHost resolver failed:", url);
            return null;
        } catch (err) {
            logError("TurboImageHost resolver error:", err);
            return null;
        }
    },

    // --- FastPic ---
    "fastpic.org": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`FastPic HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("img");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("FastPic resolver failed:", url);
            return null;
        } catch (err) {
            logError("FastPic resolver error:", err);
            return null;
        }
    },

    "fastpic.ru": async (url) => hostResolvers["fastpic.org"](url),

    // --- ImageTwist ---
    "imagetwist.com": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`ImageTwist HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("img#image");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("ImageTwist resolver failed:", url);
            return null;
        } catch (err) {
            logError("ImageTwist resolver error:", err);
            return null;
        }
    },

    // --- ImgView ---
    "imgview.net": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`ImgView HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("img.pic");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("ImgView resolver failed:", url);
            return null;
        } catch (err) {
            logError("ImgView resolver error:", err);
            return null;
        }
    },

    // --- Radikal ---
    "radikal.ru": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Radikal HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("img#mainImage");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("Radikal resolver failed:", url);
            return null;
        } catch (err) {
            logError("Radikal resolver error:", err);
            return null;
        }
    },

    // --- ImageUpper ---
    "imageupper.com": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`ImageUpper HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            let img = doc.querySelector("img#img");
            if (img && img.src) return new URL(img.src, url).href;

            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) return new URL(og.content, url).href;

            logWarn("ImageUpper resolver failed:", url);
            return null;
        } catch (err) {
            logError("ImageUpper resolver error:", err);
            return null;
        }
    }
};

// --- Generic resolver (dispatcher) ---
async function resolveLink(url) {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, "");
        const resolver = Object.keys(hostResolvers).find((host) =>
            hostname.endsWith(host)
        );

        if (resolver) {
            return await hostResolvers[resolver](url);
        }

        logWarn("No resolver for host:", hostname);
        return null;
    } catch (err) {
        logError("resolveLink error:", err);
        return null;
    }
}
