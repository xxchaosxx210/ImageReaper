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
            const res = await fetch(u);
            const html = await res.text();
            return new DOMParser().parseFromString(html, "text/html");
        }

        let doc = await fetchDoc(url);

        // Step 1: detect interstitial
        const continueLink = doc.querySelector("#continue a[data-shown='inter']");
        if (continueLink && continueLink.href) {
            // Ask background script to set cookie
            await new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { action: "setImageBamCookie" },
                    (response) => {
                        console.log("ImageBam cookie response:", response);
                        resolve();
                    }
                );
            });

            // Retry fetch with cookie set
            doc = await fetchDoc(continueLink.href);
        }

        // Step 2: now look for the image
        let img =
            doc.querySelector("#imageContainer img") ||
            doc.querySelector(".main-image") ||
            doc.querySelector("img#mainImage");

        if (img && img.src) return new URL(img.src, url).href;

        // Step 3: fallback meta
        const og = doc.querySelector('meta[property="og:image"]');
        if (og && og.content) return new URL(og.content, url).href;

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
