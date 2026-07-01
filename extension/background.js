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
let allowedSites = [];

// Timer State
let timerInterval = null;
let remainingSeconds = 25 * 60;
let currentModeIdx = 0; // 0: Focus, 1: Short, 2: Long
let isTimerRunning = false;
let taskId = null;
let targetEndTime = null;

// Load custom config if present on startup
chrome.storage.local.get("customSettings", (res) => {
    if (res.customSettings) {
        if (res.customSettings.blockedSites) blockedSites = res.customSettings.blockedSites;
        if (res.customSettings.allowedSites) allowedSites = res.customSettings.allowedSites;
    }
});

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

// Environment Discovery helper
function getBackendUrl(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let url = "https://focusflow-backend-liuf.onrender.com/api";
        if (tabs && tabs[0] && tabs[0].url) {
            const pageUrl = tabs[0].url;
            if (pageUrl.includes("localhost") || pageUrl.includes("127.0.0.1")) {
                url = "http://localhost:5000/api";
            }
        }
        callback(url);
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
            
            getBackendUrl((backendUrl) => {
                fetch(`${backendUrl}/website-usage/log`, {
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
    });
}

// Run periodic sync flush to server every 30 seconds
setInterval(syncLogsToBackend, 30000);

// Timer persistence helpers
function saveTimerStateToStorage() {
    chrome.storage.local.set({
        timerState: {
            isRunning: isTimerRunning,
            currentModeIdx,
            remainingSeconds,
            targetEndTime,
            taskId,
            allowedSites
        }
    });
}

function broadcastStateToTabs(extra = {}) {
    const timerState = {
        isRunning: isTimerRunning,
        currentModeIdx,
        remainingSeconds,
        targetEndTime,
        taskId,
        allowedSites
    };

    // Broadcast to extension popup if open
    chrome.runtime.sendMessage({
        type: "TIMER_TICK",
        state: timerState,
        ...extra
    }, () => {
        if (chrome.runtime.lastError) {}
    });

    // Broadcast to open tabs
    chrome.tabs.query({}, (tabs) => {
        if (tabs && tabs.length > 0) {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: "TIMER_TICK",
                        state: timerState,
                        ...extra
                    }, () => {
                        if (chrome.runtime.lastError) {}
                    });
                }
            });
        }
    });
}

function checkActiveTabForTimerDecrement(callback) {
    if (!allowedSites || allowedSites.length === 0) {
        callback(true);
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            callback(false);
            return;
        }
        
        try {
            const url = tabs[0].url;
            if (!url) {
                callback(false);
                return;
            }
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace("www.", "");

            // Always allow FocusFlow app itself (localhost or any focusflow domain)
            if (domain.includes("localhost") || domain.includes("focusflow") || url.startsWith("chrome-extension://")) {
                callback(true);
                return;
            }

            // Check if domain matches any of the allowed sites
            const isMatch = allowedSites.some(site => {
                const cleanSite = site.trim().replace("www.", "");
                return cleanSite && domain.includes(cleanSite);
            });

            callback(isMatch);
        } catch (e) {
            callback(false);
        }
    });
}

function startTimerInBackground(duration, modeIdx, tId, allowed) {
    clearInterval(timerInterval);
    isTimerRunning = true;
    remainingSeconds = duration;
    currentModeIdx = modeIdx;
    taskId = tId;
    allowedSites = allowed || [];
    targetEndTime = Date.now() + remainingSeconds * 1000;

    // Enable blocker if starting a Focus session
    if (currentModeIdx === 0) {
        isFocusActive = true;
        blockActiveTabs();
    }

    saveTimerStateToStorage();
    broadcastStateToTabs();

    timerInterval = setInterval(() => {
        if (!isTimerRunning) {
            clearInterval(timerInterval);
            return;
        }

        checkActiveTabForTimerDecrement((shouldDecrement) => {
            if (shouldDecrement) {
                remainingSeconds--;
                targetEndTime = Date.now() + remainingSeconds * 1000;
                
                if (remainingSeconds <= 0) {
                    clearInterval(timerInterval);
                    isTimerRunning = false;
                    handleTimerCompleteInBackground();
                } else {
                    saveTimerStateToStorage();
                    broadcastStateToTabs();
                }
            } else {
                targetEndTime = Date.now() + remainingSeconds * 1000;
                saveTimerStateToStorage();
                broadcastStateToTabs({ pausedByDomain: true });
            }
        });
    }, 1000);
}

function pauseTimerInBackground() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    isFocusActive = false; // Disable blocker
    saveTimerStateToStorage();
    broadcastStateToTabs();
}

function resetTimerInBackground() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    isFocusActive = false;
    remainingSeconds = currentModeIdx === 0 ? 25 * 60 : (currentModeIdx === 1 ? 5 * 60 : 15 * 60);
    saveTimerStateToStorage();
    broadcastStateToTabs();
}

async function handleTimerCompleteInBackground() {
    isTimerRunning = false;
    isFocusActive = false;
    saveTimerStateToStorage();

    // Broadcast play alarm to open tabs
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: "PLAY_ALARM" }, () => {
                    if (chrome.runtime.lastError) {}
                });
            }
        });
    });

    // Native desktop notification
    chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icon128.png",
        title: "FocusFlow Alert ⚡",
        message: `${currentModeIdx === 0 ? "Focus block" : "Break time"} completed! Take a step back and breathe.`,
        priority: 2
    }, () => {
        if (chrome.runtime.lastError) {}
    });

    // Save session logs to Backend
    chrome.storage.local.get(["token", "sessionMetrics"], async (res) => {
        if (!res.token) return;

        const duration = currentModeIdx === 0 ? 25 * 60 : (currentModeIdx === 1 ? 5 * 60 : 15 * 60);
        const end = new Date();
        const start = new Date(end.getTime() - duration * 1000);
        const metrics = res.sessionMetrics || { interruptions: 0, pauseCount: 0 };

        getBackendUrl(async (backendUrl) => {
            try {
                await fetch(`${backendUrl}/focus`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${res.token}`
                    },
                    body: JSON.stringify({
                        taskId: taskId || null,
                        sessionType: currentModeIdx === 0 ? "Focus" : (currentModeIdx === 1 ? "Short Break" : "Long Break"),
                        duration,
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                        completed: true,
                        interruptions: metrics.interruptions || 0,
                        pauseCount: metrics.pauseCount || 0,
                        followedSchedule: true,
                        difficultyRating: 3,
                        difficultyFeedback: "Normal"
                    })
                });
                // Reset metrics in storage
                chrome.storage.local.set({ sessionMetrics: { interruptions: 0, pauseCount: 0 } });
            } catch (err) {
                console.error("Failed to auto-save completed session from background:", err);
            }
        });
    });
}

// Listen for messages from popup.js or content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const timerState = {
        isRunning: isTimerRunning,
        currentModeIdx,
        remainingSeconds,
        targetEndTime,
        taskId,
        allowedSites
    };

    if (request.type === "PING") {
        sendResponse({ type: "PONG" });
    } else if (request.type === "START_TIMER") {
        startTimerInBackground(request.duration, request.modeIdx, request.taskId, request.allowedSites);
        sendResponse({
            type: "TIMER_TICK",
            state: {
                isRunning: true,
                currentModeIdx: request.modeIdx,
                remainingSeconds: request.duration,
                targetEndTime: Date.now() + request.duration * 1000,
                taskId: request.taskId,
                allowedSites: request.allowedSites
            }
        });
    } else if (request.type === "PAUSE_TIMER") {
        pauseTimerInBackground();
        sendResponse({
            type: "TIMER_TICK",
            state: {
                ...timerState,
                isRunning: false
            }
        });
    } else if (request.type === "RESET_TIMER") {
        resetTimerInBackground();
        sendResponse({
            type: "TIMER_TICK",
            state: {
                ...timerState,
                isRunning: false,
                remainingSeconds: currentModeIdx === 0 ? 25 * 60 : (currentModeIdx === 1 ? 5 * 60 : 15 * 60)
            }
        });
    } else if (request.type === "GET_TIMER_STATE") {
        sendResponse({
            type: "TIMER_TICK",
            state: timerState
        });
    } else if (request.type === "UPDATE_ALLOWED_SITES") {
        allowedSites = request.allowedSites || [];
        saveTimerStateToStorage();
        broadcastStateToTabs();
        sendResponse({ status: "updated" });
    } else if (request.type === "START_FOCUS") {
        isFocusActive = true;
        if (request.blockedSites && request.blockedSites.length > 0) {
            blockedSites = request.blockedSites;
        }
        if (request.allowedSites) {
            allowedSites = request.allowedSites;
        }
        blockActiveTabs();
        sendResponse({ status: "focused", blocked: blockedSites, allowed: allowedSites });
    } else if (request.type === "STOP_FOCUS") {
        isFocusActive = false;
        syncLogsToBackend(); // Flush logs immediately at end of session
        sendResponse({ status: "idle" });
    } else if (request.type === "GET_STATUS") {
        sendResponse({ isFocusActive, blockedSites, allowedSites });
    } else if (request.type === "UPDATE_CONFIGS") {
        if (request.blockedSites) {
            blockedSites = request.blockedSites;
        }
        if (request.allowedSites) {
            allowedSites = request.allowedSites;
        }
        if (isFocusActive) {
            blockActiveTabs();
        }
        sendResponse({ status: "updated", blocked: blockedSites, allowed: allowedSites });
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
        
        // Check whitelist first
        const isAllowed = allowedSites.some(site => domain.includes(site));
        if (isAllowed) return;

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
