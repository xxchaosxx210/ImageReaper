/**
 * ImageReaper - Host Resolvers
 * ----------------------------
 * Each host has a resolver that takes a viewer URL and
 * returns a direct image URL (or null if not found).
 *
 * Usage:
 *   const directUrl = await resolveLink(viewerUrl);
 */

// --- Host-specific resolvers ---
const HOST_RESOLVERS = {
    "pixhost.to": async (url) => {
        const response = await fetch(url);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        // Pixhost: <img id="image">
        const img = doc.querySelector("#image");
        return img ? img.src : null;
    },

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

            // Step 3: fallback to og:image
            const og = doc.querySelector('meta[property="og:image"]');
            if (og && og.content) {
                return new URL(og.content, url).href;
            }
        }

        console.warn("⚠️ ImageBam resolver failed after retries:", url);
        return null;
    },
    // --- Stubs for future hosts ---
    "imgbox.com": async (url) => {
        // TODO: fetch page, return <img class="img">
        return null;
    },

    "pimpandhost.com": async (url) => {
        // TODO: fetch page, return meta og:image or link[rel="image_src"]
        return null;
    },

    "imagevenue.com": async (url) => {
        // TODO: fetch page, return <img id="thepic">
        return null;
    },

    "turboimagehost.com": async (url) => {
        // TODO: fetch page, return <img id="imageid">
        return null;
    },

    "postimg.cc": async (url) => {
        // TODO: fetch page, return meta og:image
        return null;
    }
};

// --- Generic resolver ---
async function resolveLink(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        const resolver = HOST_RESOLVERS[host];
        if (!resolver) {
            console.warn("No resolver for host:", host);
            return url; // fallback: return original viewer link
        }

        const directUrl = await resolver(url);
        if (directUrl) {
            console.log(`Resolved [${host}] → ${directUrl}`);
            return directUrl;
        } else {
            console.warn(`Resolver failed for [${host}] → ${url}`);
            return url; // fallback
        }
    } catch (err) {
        console.error("Error resolving link:", url, err);
        return url;
    }
}
