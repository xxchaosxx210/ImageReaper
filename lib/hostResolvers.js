// hostResolvers.js
// Central place for all host-specific resolvers

const hostResolvers = {
    // --- Pixhost ---
    "pixhost.to": async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Pixhost HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            // Main image selectors
            let img = doc.querySelector("#image") || doc.querySelector("img#show_image");
            if (img && img.src) {
                return new URL(img.src, url).href;
            }

            // Fallback to og:image
            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) {
                return new URL(og.content, url).href;
            }

            console.warn("Pixhost resolver failed:", url);
            return null;
        } catch (err) {
            console.error("Pixhost resolver error:", err);
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
                console.warn("ImageBam fetch failed:", err);
                return null;
            }
        }

        async function setCookieSafe() {
            return new Promise((resolve) => {
                let done = false;

                const timer = setTimeout(() => {
                    if (!done) {
                        console.warn("ImageBam cookie request timed out");
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

            // Step 1: detect interstitial
            const continueLink = doc.querySelector("#continue a[data-shown='inter']");
            if (continueLink && continueLink.href) {
                console.log("🔎 ImageBam interstitial detected, setting cookie...");
                await setCookieSafe();

                doc = await fetchDoc(continueLink.href);
                if (!doc) return null;
            }

            // Step 2: look for actual image
            let img =
                doc.querySelector("#imageContainer img") ||
                doc.querySelector(".main-image") ||
                doc.querySelector("img#mainImage");

            if (img && img.src) {
                return new URL(img.src, url).href;
            }

            // Step 3: fallback meta
            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) {
                return new URL(og.content, url).href;
            }
        }

        console.warn("⚠️ ImageBam resolver failed after retries:", url);
        return null;
    }
};

// --- Generic resolver (fallback) ---
async function resolveLink(url) {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, "");
        const resolver = Object.keys(hostResolvers).find((host) =>
            hostname.endsWith(host)
        );

        if (resolver) {
            return await hostResolvers[resolver](url);
        }

        console.warn("No resolver for host:", hostname);
        return null;
    } catch (err) {
        console.error("resolveLink error:", err);
        return null;
    }
}
