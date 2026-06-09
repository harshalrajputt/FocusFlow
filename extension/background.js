let isFocusActive = false;
let blockedSites = [
    "youtube.com",
    "instagram.com",
    "facebook.com",
    "reddit.com",
    "twitter.com",
    "netflix.com",
    "twitch.tv",
    "roblox.com"
];

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "START_FOCUS") {
        isFocusActive = true;
        if (request.blockedSites && request.blockedSites.length > 0) {
            blockedSites = request.blockedSites;
        }
        // Immediately scan and block open tabs
        blockActiveTabs();
        sendResponse({ status: "focused", blocked: blockedSites });
    } else if (request.type === "STOP_FOCUS") {
        isFocusActive = false;
        sendResponse({ status: "idle" });
    } else if (request.type === "GET_STATUS") {
        sendResponse({ isFocusActive, blockedSites });
    }
    return true;
});

// Helper to check and block a tab
function checkAndBlockTab(tabId, url) {
    if (!url) return;
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace("www.", "");
        
        const isBlocked = blockedSites.some(site => domain.includes(site));
        if (isBlocked) {
            chrome.tabs.update(tabId, {
                url: chrome.runtime.getURL("block.html")
            });
            // Increment distraction count in storage
            chrome.storage.local.get("sessionMetrics", (res) => {
                const metrics = res.sessionMetrics || { interruptions: 0, pauseCount: 0 };
                metrics.interruptions = (metrics.interruptions || 0) + 1;
                chrome.storage.local.set({ sessionMetrics: metrics });
            });
        }
    } catch (e) {
        // Ignore invalid URLs (like chrome:// settings)
    }
}

// Scan and block matching tabs currently open
function blockActiveTabs() {
    chrome.tabs.query({}, (tabs) => {
        if (tabs && tabs.length > 0) {
            tabs.forEach(tab => {
                if (tab.id && tab.url) {
                    checkAndBlockTab(tab.id, tab.url);
                }
            });
        }
    });
}

// Monitor tab updates and block if focus is active
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isFocusActive && changeInfo.url) {
        checkAndBlockTab(tabId, changeInfo.url);
    }
});

// Monitor tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
    if (isFocusActive && activeInfo.tabId) {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (chrome.runtime.lastError) return;
            if (tab && tab.url) {
                checkAndBlockTab(activeInfo.tabId, tab.url);
            }
        });
    }
});

