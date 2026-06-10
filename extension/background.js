let isFocusActive = false;
let blockedSites = [
    "youtube.com",
    "instagram.com",
    "facebook.com",
    "reddit.com",
    "twitter.com",
    "x.com",
    "netflix.com",
    "twitch.tv",
    "roblox.com"
];

// Telemetry State
let activeDomain = null;
let activeStartTime = null;

// Helper to get clean hostname from URL
function getDomainFromUrl(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        // Do not track chrome settings or extension local pages
        if (urlObj.protocol === "chrome:" || urlObj.protocol === "chrome-extension:") {
            return null;
        }
        return urlObj.hostname.replace("www.", "");
    } catch (e) {
        return null;
    }
}

// Flush and track time spent on the active domain
function trackCurrentDomain(url) {
    const hostname = getDomainFromUrl(url);
    const now = Date.now();
    
    if (activeDomain && activeStartTime) {
        const seconds = Math.round((now - activeStartTime) / 1000);
        if (seconds > 0) {
            accumulateTime(activeDomain, seconds);
        }
    }
    
    activeDomain = hostname;
    activeStartTime = now;
}

// Save active seconds locally in extension storage
function accumulateTime(domain, seconds) {
    chrome.storage.local.get(["webUsageLogs"], (res) => {
        const logs = res.webUsageLogs || {};
        logs[domain] = (logs[domain] || 0) + seconds;
        chrome.storage.local.set({ webUsageLogs: logs });
    });
}

// Send accumulated logs to backend
function syncLogsToBackend() {
    // Flush current domain time first to capture latest active session seconds
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        if (activeTabs && activeTabs[0]) {
            trackCurrentDomain(activeTabs[0].url);
        } else {
            trackCurrentDomain(null);
        }

        chrome.storage.local.get(["token", "webUsageLogs"], (res) => {
            if (!res.token || !res.webUsageLogs) return;
            
            const logs = res.webUsageLogs;
            const dateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format local date
            
            const logList = Object.entries(logs).map(([domain, timeSpent]) => ({
                domain,
                timeSpent,
                date: dateStr
            }));
            
            if (logList.length === 0) return;
            
            fetch("http://localhost:5000/api/website-usage/log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${res.token}`
                },
                body: JSON.stringify({ logs: logList })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Subtract successfully sent logs to prevent race conditions during browsing
                    chrome.storage.local.get(["webUsageLogs"], (currentRes) => {
                        const currentLogs = currentRes.webUsageLogs || {};
                        for (const [domain, sentSec] of Object.entries(logs)) {
                            if (currentLogs[domain]) {
                                currentLogs[domain] -= sentSec;
                                if (currentLogs[domain] <= 0) {
                                    delete currentLogs[domain];
                                }
                            }
                        }
                        chrome.storage.local.set({ webUsageLogs: currentLogs });
                    });
                }
            })
            .catch(err => {
                console.error("Error syncing web logs to backend:", err);
            });
        });
    });
}

// Run periodic sync flush to server every 30 seconds
setInterval(syncLogsToBackend, 30000);

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "START_FOCUS") {
        isFocusActive = true;
        if (request.blockedSites && request.blockedSites.length > 0) {
            blockedSites = request.blockedSites;
        }
        blockActiveTabs();
        sendResponse({ status: "focused", blocked: blockedSites });
    } else if (request.type === "STOP_FOCUS") {
        isFocusActive = false;
        syncLogsToBackend(); // Flush logs immediately at end of session
        sendResponse({ status: "idle" });
    } else if (request.type === "GET_STATUS") {
        sendResponse({ isFocusActive, blockedSites });
    } else if (request.type === "FORCE_SYNC") {
        syncLogsToBackend();
        sendResponse({ status: "synced" });
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
            // Increment distraction count in local session state
            chrome.storage.local.get("sessionMetrics", (res) => {
                const metrics = res.sessionMetrics || { interruptions: 0, pauseCount: 0 };
                metrics.interruptions = (metrics.interruptions || 0) + 1;
                chrome.storage.local.set({ sessionMetrics: metrics });
            });
        }
    } catch (e) {
        // Ignore invalid URLs
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
    if (changeInfo.url) {
        // Track the domain update if it's the active tab in the current window
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
            if (activeTabs && activeTabs[0] && activeTabs[0].id === tabId) {
                trackCurrentDomain(changeInfo.url);
            }
        });

        if (isFocusActive) {
            checkAndBlockTab(tabId, changeInfo.url);
        }
    }
});

// Monitor tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        if (tab.url) {
            trackCurrentDomain(tab.url);
        }
        if (isFocusActive && tab.url) {
            checkAndBlockTab(activeInfo.tabId, tab.url);
        }
    });
});

// Monitor window focus activation
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser minimized or lost focus; stop tracking active time
        trackCurrentDomain(null);
    } else {
        chrome.tabs.query({ active: true, windowId: windowId }, (activeTabs) => {
            if (activeTabs && activeTabs[0] && activeTabs[0].url) {
                trackCurrentDomain(activeTabs[0].url);
            }
        });
    }
});

// Monitor system idle state
chrome.idle.onStateChanged.addListener((state) => {
    if (state === "idle" || state === "locked") {
        trackCurrentDomain(null);
    } else if (state === "active") {
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
            if (activeTabs && activeTabs[0] && activeTabs[0].url) {
                trackCurrentDomain(activeTabs[0].url);
            }
        });
    }
});

// Initial load check
chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    if (activeTabs && activeTabs[0] && activeTabs[0].url) {
        trackCurrentDomain(activeTabs[0].url);
    }
});
