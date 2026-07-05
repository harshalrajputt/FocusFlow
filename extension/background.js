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

// Load custom config and restore timer state on startup/wake-up
chrome.storage.local.get(["customSettings", "timerState"], (res) => {
    if (res.customSettings) {
        if (res.customSettings.blockedSites) blockedSites = res.customSettings.blockedSites;
        if (res.customSettings.allowedSites) allowedSites = res.customSettings.allowedSites;
    }

    if (res.timerState) {
        const state = res.timerState;
        isTimerRunning = state.isRunning || false;
        currentModeIdx = state.currentModeIdx || 0;
        remainingSeconds = state.remainingSeconds !== undefined ? state.remainingSeconds : 25 * 60;
        targetEndTime = state.targetEndTime || null;
        taskId = state.taskId || null;
        allowedSites = state.allowedSites || [];

        // Restore blocker active status if focus mode is active
        if (isTimerRunning && currentModeIdx === 0) {
            isFocusActive = true;
        }

        // If the timer was running, calculate wall clock drift and resume
        if (isTimerRunning && targetEndTime) {
            const secondsLeft = Math.round((targetEndTime - Date.now()) / 1000);
            if (secondsLeft > 0) {
                remainingSeconds = secondsLeft;
                startCountdownLoop();
            } else {
                remainingSeconds = 0;
                isTimerRunning = false;
                handleTimerCompleteInBackground();
            }
        }
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

const APP_DOMAINS = ['focus-flow-flame-five.vercel.app', 'localhost', '127.0.0.1'];

function shouldSkipDomain(domain) {
    if (!domain) return true;
    return APP_DOMAINS.some(d => domain.includes(d));
}

// Save active seconds locally in extension storage
function accumulateTime(domain, seconds) {
    if (shouldSkipDomain(domain)) return;
    chrome.storage.local.get(["webUsageLogs"], (res) => {
        const logs = res.webUsageLogs || {};
        
        let category = null;
        if (isTimerRunning && allowedSites && allowedSites.length > 0) {
            const isMatch = allowedSites.some(site => {
                const cleanSite = getDomainFromInput(site);
                if (!cleanSite) return false;
                const primaryDomain = cleanSite.split('.')[0];
                return domain.toLowerCase().includes(cleanSite) || 
                       cleanSite.includes(domain.toLowerCase()) || 
                       (primaryDomain.length > 2 && domain.toLowerCase().includes(primaryDomain));
            });
            if (isMatch) {
                category = "Productive";
            }
        }

        if (logs[domain]) {
            if (typeof logs[domain] === "number") {
                logs[domain] = {
                    timeSpent: logs[domain] + seconds,
                    category: category
                };
            } else {
                logs[domain].timeSpent = (logs[domain].timeSpent || 0) + seconds;
                if (category) {
                    logs[domain].category = category;
                }
            }
        } else {
            logs[domain] = {
                timeSpent: seconds,
                category: category
            };
        }
        chrome.storage.local.set({ webUsageLogs: logs });
    });
}

// Environment Discovery helper
function getBackendUrl(callback) {
    chrome.tabs.query({}, (tabs) => {
        let hasLocalhost = false;
        if (tabs && tabs.length > 0) {
            hasLocalhost = tabs.some(tab => tab.url && (tab.url.includes("localhost") || tab.url.includes("127.0.0.1")));
        }
        const url = hasLocalhost 
            ? "http://localhost:5000/api" 
            : "https://focusflow-backend-liuf.onrender.com/api";
        callback(url);
    });
}

// Send accumulated logs to backend
function syncLogsToBackend() {
    // Flush current domain time first to capture latest active session seconds
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (activeTabs) => {
        if (activeTabs && activeTabs[0]) {
            trackCurrentDomain(activeTabs[0].url);
        } else {
            trackCurrentDomain(null);
        }

        chrome.storage.local.get(["token", "webUsageLogs"], (res) => {
            if (!res.token || !res.webUsageLogs) return;
            
            const logs = res.webUsageLogs;
            const dateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format local date
            
            const logList = Object.entries(logs).map(([domain, value]) => {
                const timeSpent = typeof value === "number" ? value : (value.timeSpent || 0);
                let category = typeof value === "number" ? null : (value.category || null);
                
                if (!category && isTimerRunning && allowedSites && allowedSites.length > 0) {
                    const isMatch = allowedSites.some(site => {
                        const cleanSite = getDomainFromInput(site);
                        if (!cleanSite) return false;
                        const primaryDomain = cleanSite.split('.')[0];
                        return domain.toLowerCase().includes(cleanSite) || 
                               cleanSite.includes(domain.toLowerCase()) || 
                               (primaryDomain.length > 2 && domain.toLowerCase().includes(primaryDomain));
                    });
                    if (isMatch) {
                        category = "Productive";
                    }
                }
                return {
                    domain,
                    timeSpent,
                    date: dateStr,
                    category
                };
            }).filter(item => item.timeSpent > 0);
            
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
                            for (const [domain, sentVal] of Object.entries(logs)) {
                                const sentSec = typeof sentVal === "number" ? sentVal : (sentVal.timeSpent || 0);
                                if (currentLogs[domain]) {
                                    if (typeof currentLogs[domain] === "number") {
                                        currentLogs[domain] -= sentSec;
                                        if (currentLogs[domain] <= 0) {
                                            delete currentLogs[domain];
                                        }
                                    } else {
                                        currentLogs[domain].timeSpent -= sentSec;
                                        if (currentLogs[domain].timeSpent <= 0) {
                                            delete currentLogs[domain];
                                        }
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

function updatePresenceInBackend(active, taskLabel = "") {
    chrome.storage.local.get("token", (res) => {
        if (!res.token) return;
        getBackendUrl((backendUrl) => {
            fetch(`${backendUrl}/focus/presence`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${res.token}`
                },
                body: JSON.stringify({ active, taskLabel })
            })
            .then(response => {
                if (response.status === 409 && active) {
                    // Conflict! Stop the timer immediately and alert the user
                    pauseTimerInBackground();
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "FocusFlowIcon.png",
                        title: "FocusFlow Warning",
                        message: "You already have an active session! Complete it first."
                    });
                }
            })
            .catch(err => {
                console.error("Error updating presence from background:", err);
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

function getDomainFromInput(input) {
    if (!input) return "";
    let clean = input.trim().toLowerCase();
    
    if (clean.startsWith("http://")) clean = clean.substring(7);
    if (clean.startsWith("https://")) clean = clean.substring(8);
    
    const slashIdx = clean.indexOf("/");
    if (slashIdx !== -1) {
        clean = clean.substring(0, slashIdx);
    }
    
    if (clean.startsWith("www.")) {
        clean = clean.substring(4);
    }
    
    return clean;
}

function checkActiveTabForTimerDecrement(callback) {
    if (!allowedSites || allowedSites.length === 0) {
        callback(true);
        return;
    }

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
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
            const domain = urlObj.hostname.replace("www.", "").toLowerCase();

            // Always allow chrome-extension internal settings pages
            if (url.startsWith("chrome-extension://")) {
                callback(true);
                return;
            }

            // Check if domain matches any of the allowed sites
            const isMatch = allowedSites.some(site => {
                const cleanSite = getDomainFromInput(site);
                if (!cleanSite) return false;
                const primaryDomain = cleanSite.split('.')[0];
                return domain.includes(cleanSite) || 
                       cleanSite.includes(domain) || 
                       (primaryDomain.length > 2 && domain.includes(primaryDomain));
            });

            callback(isMatch);
        } catch (e) {
            callback(false);
        }
    });
}

function startTimerInBackground(duration, modeIdx, tId, allowed, taskLabel, skipPresenceUpdate) {
    clearInterval(timerInterval);
    isTimerRunning = true;
    remainingSeconds = duration;
    currentModeIdx = modeIdx;
    taskId = tId;
    allowedSites = allowed || [];
    targetEndTime = Date.now() + remainingSeconds * 1000;

    // Enable blocker and backend presence update if starting a Focus session
    if (currentModeIdx === 0) {
        isFocusActive = true;
        blockActiveTabs();
        if (!skipPresenceUpdate) {
            updatePresenceInBackend(true, taskLabel || "");
        }
    }

    saveTimerStateToStorage();
    broadcastStateToTabs();

    startCountdownLoop();
}

function startCountdownLoop() {
    clearInterval(timerInterval);
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
    if (currentModeIdx === 0) {
        updatePresenceInBackend(false);
    }
    saveTimerStateToStorage();
    broadcastStateToTabs();
}

function resetTimerInBackground() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    isFocusActive = false;
    if (currentModeIdx === 0) {
        updatePresenceInBackend(false);
    }
    remainingSeconds = currentModeIdx === 0 ? 25 * 60 : (currentModeIdx === 1 ? 5 * 60 : 15 * 60);
    saveTimerStateToStorage();
    broadcastStateToTabs();
}

async function handleTimerCompleteInBackground() {
    isTimerRunning = false;
    isFocusActive = false;
    if (currentModeIdx === 0) {
        updatePresenceInBackend(false);
    }
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

    // Save session logs to Backend (Always save from background worker to prevent loss on sleep/throttling)
    chrome.storage.local.get(["token", "sessionMetrics"], async (res) => {
        if (!res.token) return;

        // Use custom settings if available
        let duration = currentModeIdx === 0 ? 25 * 60 : (currentModeIdx === 1 ? 5 * 60 : 15 * 60);
        const result = await chrome.storage.local.get("customSettings");
        if (result.customSettings) {
            duration = currentModeIdx === 0 ? (result.customSettings.focusTime * 60) : (currentModeIdx === 1 ? (result.customSettings.shortTime * 60) : (result.customSettings.longTime * 60));
        }

        const end = new Date();
        const start = new Date(end.getTime() - duration * 1000);
        const metrics = res.sessionMetrics || { interruptions: 0, pauseCount: 0 };

        getBackendUrl(async (backendUrl) => {
            try {
                const response = await fetch(`${backendUrl}/focus`, {
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
                        difficultyFeedback: "Normal",
                        telemetryAvailable: true
                    })
                });
                const data = await response.json();
                if (data.success && data.session && data.session._id) {
                    // Save the last session ID to storage so webapp can load it to submit feedback ratings
                    chrome.storage.local.set({ lastSessionId: data.session._id });
                    
                    // Broadcast session logged event to webpage
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                            if (tab.id) {
                                chrome.tabs.sendMessage(tab.id, { 
                                    type: "SESSION_LOGGED", 
                                    sessionId: data.session._id,
                                    session: data.session
                                }, () => {
                                    if (chrome.runtime.lastError) {}
                                });
                            }
                        });
                    });
                }
                
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
        const skipPresenceUpdate = request.source === "focusflow-webapp";
        startTimerInBackground(request.duration, request.modeIdx, request.taskId, request.allowedSites, request.taskLabel, skipPresenceUpdate);
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
    } else if (request.type === "CHANGE_MODE") {
        currentModeIdx = request.modeIdx;
        isFocusActive = false;
        clearInterval(timerInterval);
        isTimerRunning = false;
        if (currentModeIdx === 0) {
            updatePresenceInBackend(false);
        }
        chrome.storage.local.get("customSettings", (res) => {
            const settings = res.customSettings || { focusTime: 25, shortTime: 5, longTime: 15 };
            const focusVal = settings.focusTime || 25;
            const shortVal = settings.shortTime || 5;
            const longVal = settings.longTime || 15;
            
            remainingSeconds = currentModeIdx === 0 ? focusVal * 60 : (currentModeIdx === 1 ? shortVal * 60 : longVal * 60);
            
            saveTimerStateToStorage();
            broadcastStateToTabs();
            
            sendResponse({
                type: "TIMER_TICK",
                state: {
                    isRunning: false,
                    currentModeIdx,
                    remainingSeconds,
                    targetEndTime: null,
                    taskId,
                    allowedSites
                }
            });
        });
        return true;
    } else if (request.type === "GET_TIMER_STATE") {
        chrome.storage.local.get("lastSessionId", (res) => {
            sendResponse({
                type: "TIMER_TICK",
                state: timerState,
                lastSessionId: res.lastSessionId || null
            });
        });
        return true;
    } else if (request.type === "STOP_ALARM") {
        chrome.tabs.query({}, (tabs) => {
            if (tabs && tabs.length > 0) {
                tabs.forEach(tab => {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, { type: "STOP_ALARM" }, () => {
                            if (chrome.runtime.lastError) {}
                        });
                    }
                });
            }
        });
        sendResponse({ status: "silenced" });
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
        const isAllowed = allowedSites.some(site => {
            const cleanSite = getDomainFromInput(site);
            if (!cleanSite) return false;
            const primaryDomain = cleanSite.split('.')[0];
            return domain.includes(cleanSite) || 
                   cleanSite.includes(domain) || 
                   (primaryDomain.length > 2 && domain.includes(primaryDomain));
        });
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
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (activeTabs) => {
            if (activeTabs && activeTabs[0] && activeTabs[0].url) {
                trackCurrentDomain(activeTabs[0].url);
            }
        });
    }
});

// Initial load check
chrome.tabs.query({ active: true, lastFocusedWindow: true }, (activeTabs) => {
    if (activeTabs && activeTabs[0] && activeTabs[0].url) {
        trackCurrentDomain(activeTabs[0].url);
    }
});
