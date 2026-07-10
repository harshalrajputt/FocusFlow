let BACKEND_URL = "https://focusflow-backend-liuf.onrender.com/api";

// DOM Elements
const authScreen = document.getElementById("auth-screen");
const timerScreen = document.getElementById("timer-screen");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const timerDisplay = document.getElementById("timer");
const statusDisplay = document.getElementById("status");
const playBtn = document.getElementById("play-btn");
const resetBtn = document.getElementById("reset-btn");
const skipBtn = document.getElementById("skip-btn");
const taskSelect = document.getElementById("task-select");

const modeFocus = document.getElementById("mode-focus");
const modeShort = document.getElementById("mode-short");
const modeLong = document.getElementById("mode-long");

// Timer configuration matching MODES
const DURATIONS = [25 * 60, 5 * 60, 15 * 60]; // Focus, Short, Long (seconds)
const MODE_NAMES = ["Focus", "Short Break", "Long Break"];
let currentModeIdx = 0;
let remainingSeconds = DURATIONS[0];
let timerInterval = null;
let isRunning = false;
let startTimeStamp = null;

// Initialize — scan ALL open tabs to detect if a local dev server is running
chrome.tabs.query({}, (tabs) => {
    const hasLocalhost = tabs && tabs.some(tab => tab.url && (tab.url.includes("localhost") || tab.url.includes("127.0.0.1")));
    if (hasLocalhost) {
        BACKEND_URL = "http://localhost:5000/api";
    }

    chrome.storage.local.get(["token", "timerState", "customSettings", "allowedWorkSites"], (result) => {
        // Load custom settings
        let customSettings = result.customSettings || {
            focusTime: 25,
            shortTime: 5,
            longTime: 15,
            blockedSites: ["youtube.com", "instagram.com", "facebook.com", "reddit.com", "netflix.com"],
            allowedSites: ["google.com", "github.com", "localhost"]
        };

        if (result.allowedWorkSites) {
            document.getElementById("allowed-work-sites").value = result.allowedWorkSites;
        }

        // Update inputs in popup
        document.getElementById("cfg-focus-time").value = customSettings.focusTime;
        document.getElementById("cfg-short-time").value = customSettings.shortTime;
        document.getElementById("cfg-long-time").value = customSettings.longTime;
        document.getElementById("cfg-blocked-sites").value = customSettings.blockedSites.join(", ");
        document.getElementById("cfg-allowed-sites").value = customSettings.allowedSites.join(", ");

        // Override DURATIONS
        DURATIONS[0] = customSettings.focusTime * 60;
        DURATIONS[1] = customSettings.shortTime * 60;
        DURATIONS[2] = customSettings.longTime * 60;

        // Send update configs to background on start
        chrome.runtime.sendMessage({
            type: "UPDATE_CONFIGS",
            blockedSites: customSettings.blockedSites,
            allowedSites: customSettings.allowedSites
        });

        if (result.token) {
            showTimerScreen(result.token);
            // Force background script to flush active telemetry to the server
            chrome.runtime.sendMessage({ type: "FORCE_SYNC" });
        } else {
            showAuthScreen();
        }

        if (result.timerState) {
            restoreTimerState(result.timerState);
        } else {
            remainingSeconds = DURATIONS[currentModeIdx];
            updateTimerDisplay();
        }
    });
});


// Authentication UI
function showAuthScreen() {
    authScreen.style.display = "block";
    timerScreen.style.display = "none";
}

function showTimerScreen(token) {
    authScreen.style.display = "none";
    timerScreen.style.display = "block";
    loadTasks(token);
    syncDistractionsBlocker(token);
}

// Login Handler
loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError("All fields are required");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerText = "Connecting...";
    loginError.style.display = "none";

    try {
        const response = await fetch(`${BACKEND_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.success) {
            chrome.storage.local.set({ token: data.token, user: data.user }, () => {
                showTimerScreen(data.token);
            });
        } else {
            showError(data.message || "Invalid Credentials");
        }
    } catch (err) {
        showError("Network error connecting to FocusFlow server");
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerText = "Connect Account";
    }
});

// Logout Handler
logoutBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    chrome.storage.local.clear(() => {
        chrome.runtime.sendMessage({ type: "STOP_FOCUS" });
        isRunning = false;
        currentModeIdx = 0;
        remainingSeconds = DURATIONS[0];
        updateTimerDisplay();
        showAuthScreen();
    });
});

function showError(msg) {
    loginError.innerText = msg;
    loginError.style.display = "block";
}

// Fetch Active Tasks from Node.js
async function loadTasks(token) {
    try {
        const response = await fetch(`${BACKEND_URL}/tasks`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.tasks) {
            // Keep default option, clear others
            taskSelect.innerHTML = '<option value="">General Focus</option>';
            data.tasks
                .filter(t => t.status === "Pending" || t.status === "In Progress")
                .forEach(t => {
                    const opt = document.createElement("option");
                    opt.value = t._id;
                    opt.innerText = `${t.title} (${t.priority})`;
                    taskSelect.appendChild(opt);
                });
        }
    } catch (err) {
        console.error("Failed to load tasks", err);
    }
}

// Sync Blocklist from UserProfile Onboarding data
async function syncDistractionsBlocker(token) {
    try {
        const response = await fetch(`${BACKEND_URL}/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.data && data.data.focus) {
            const rawDist = data.data.focus.biggestDistractions || [];
            
            // Map subjective distractions to common domains
            const domainMap = {
                "Phone Notifications": [],
                "Social Media (Instagram/TikTok)": ["instagram.com", "tiktok.com", "facebook.com"],
                "Online Gaming": ["roblox.com", "twitch.tv", "steamcommunity.com"],
                "YouTube / Streaming / Netflix": ["youtube.com", "netflix.com", "twitch.tv"],
                "Family Noise / Friends": [],
                "Daydreaming / Loss of Focus": []
            };

            chrome.storage.local.get("customSettings", (res) => {
                let domains = (res.customSettings && res.customSettings.blockedSites) || ["youtube.com", "instagram.com", "netflix.com"];
                let allowed = (res.customSettings && res.customSettings.allowedSites) || [];

                rawDist.forEach(d => {
                    if (domainMap[d]) {
                        domains = [...domains, ...domainMap[d]];
                    }
                });
                const uniqueDomains = [...new Set(domains)];
                
                chrome.runtime.sendMessage({
                    type: "START_FOCUS",
                    blockedSites: uniqueDomains,
                    allowedSites: allowed
                });
            });
        }
    } catch (err) {
        console.error("Failed to sync blocklist", err);
    }
}

// Timer Controls
function updateTimerDisplay() {
    const m = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
    const s = String(remainingSeconds % 60).padStart(2, "0");
    timerDisplay.innerText = `${m}:${s}`;
}

// Mode Selection
// Mode Selection
modeFocus.addEventListener("click", () => switchMode(0));
modeShort.addEventListener("click", () => switchMode(1));
modeLong.addEventListener("click", () => switchMode(2));

function switchMode(idx) {
    currentModeIdx = idx;
    remainingSeconds = DURATIONS[idx];
    updateTimerDisplay();
    playBtn.innerText = "▶";
    statusDisplay.innerText = "Timer switched to " + MODE_NAMES[idx];

    // Reset modes buttons active class
    [modeFocus, modeShort, modeLong].forEach((btn, i) => {
        if (i === idx) btn.classList.add("active");
        else btn.classList.remove("active");
    });
    
    chrome.runtime.sendMessage({ type: "CHANGE_MODE", modeIdx: idx });
    saveTimerState();
}

// Play/Pause Action
playBtn.addEventListener("click", () => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

function startTimer() {
    isRunning = true;
    playBtn.innerText = "⏸";
    statusDisplay.innerText = currentModeIdx === 0 ? "⚡ Distraction blocker: active" : "Timer running";

    // Reset session metrics if starting a fresh focus session
    if (remainingSeconds === DURATIONS[currentModeIdx]) {
        chrome.storage.local.set({ sessionMetrics: { interruptions: 0, pauseCount: 0 } });
    }

    if (currentModeIdx === 0) {
        chrome.storage.local.get("token", (res) => {
            if (res.token) syncDistractionsBlocker(res.token);
        });
    }

    const allowedVal = document.getElementById("allowed-work-sites").value;
    const allowed = allowedVal.split(",").map(s => s.trim()).filter(Boolean);
    chrome.storage.local.set({ allowedWorkSites: allowedVal });

    chrome.runtime.sendMessage({
        type: "START_TIMER",
        duration: remainingSeconds,
        modeIdx: currentModeIdx,
        taskId: taskSelect.value || null,
        taskLabel: taskSelect.options[taskSelect.selectedIndex]?.text || "",
        allowedSites: allowed
    });
}

function pauseTimer() {
    isRunning = false;
    playBtn.innerText = "▶";
    statusDisplay.innerText = "Timer paused";
    
    // Increment pause count in storage
    chrome.storage.local.get("sessionMetrics", (res) => {
        const metrics = res.sessionMetrics || { interruptions: 0, pauseCount: 0 };
        metrics.pauseCount = (metrics.pauseCount || 0) + 1;
        chrome.storage.local.set({ sessionMetrics: metrics });
    });

    chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });
}

resetBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET_TIMER" });
});

skipBtn.addEventListener("click", () => {
    switchMode((currentModeIdx + 1) % DURATIONS.length);
});

// Timer Storage Persistence
function saveTimerState() {
    const timerState = {
        isRunning,
        currentModeIdx,
        remainingSeconds,
        targetEndTime: null
    };
    chrome.storage.local.set({ timerState });
}

function restoreTimerState(state, pausedByDomain = false) {
    if (!state) return;
    currentModeIdx = state.currentModeIdx;
    remainingSeconds = state.remainingSeconds;
    isRunning = state.isRunning;

    // Adjust active button
    [modeFocus, modeShort, modeLong].forEach((btn, i) => {
        if (i === currentModeIdx) btn.classList.add("active");
        else btn.classList.remove("active");
    });

    updateTimerDisplay();

    // Disable configurations while running to prevent conflicts
    const allowedSitesInput = document.getElementById("allowed-work-sites");
    const alarmBanner = document.getElementById("alarm-banner");
    if (isRunning) {
        playBtn.innerText = "⏸";
        if (pausedByDomain) {
            statusDisplay.innerText = "Paused - Open allowed work tab!";
            statusDisplay.style.color = "#f59e0b";
        } else {
            statusDisplay.innerText = currentModeIdx === 0 ? "⚡ Distraction blocker: active" : "Timer running";
            statusDisplay.style.color = "";
        }

        modeFocus.disabled = true;
        modeShort.disabled = true;
        modeLong.disabled = true;
        taskSelect.disabled = true;
        if (allowedSitesInput) allowedSitesInput.disabled = true;
        if (alarmBanner) alarmBanner.style.display = "none";
    } else {
        playBtn.innerText = "▶";
        if (remainingSeconds === 0) {
            statusDisplay.innerText = "Session Completed!";
            statusDisplay.style.color = "#10b981";
            if (alarmBanner) alarmBanner.style.display = "block";
        } else {
            statusDisplay.innerText = "Timer paused";
            statusDisplay.style.color = "";
            if (alarmBanner) alarmBanner.style.display = "none";
        }

        modeFocus.disabled = false;
        modeShort.disabled = false;
        modeLong.disabled = false;
        taskSelect.disabled = false;
        if (allowedSitesInput) allowedSitesInput.disabled = false;
    }
}

// Receive broadcasts from background.js
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TIMER_TICK") {
        restoreTimerState(message.state, message.pausedByDomain);
    }
    return true;
});

// Collapsible Panel Toggling
const toggleSettingsBtn = document.getElementById("toggle-settings-btn");
const settingsPanel = document.getElementById("settings-panel");

toggleSettingsBtn.addEventListener("click", () => {
    if (settingsPanel.style.display === "none") {
        settingsPanel.style.display = "block";
        toggleSettingsBtn.innerText = "▲ Hide Settings";
    } else {
        settingsPanel.style.display = "none";
        toggleSettingsBtn.innerText = "⚙ Configure Settings";
    }
});

// Save Custom Configurations
document.getElementById("save-settings-btn").addEventListener("click", () => {
    const focusTime = parseInt(document.getElementById("cfg-focus-time").value) || 25;
    const shortTime = parseInt(document.getElementById("cfg-short-time").value) || 5;
    const longTime = parseInt(document.getElementById("cfg-long-time").value) || 15;

    const blockedInput = document.getElementById("cfg-blocked-sites").value;
    const allowedInput = document.getElementById("cfg-allowed-sites").value;

    const blockedSites = blockedInput.split(",")
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);

    const allowedSites = allowedInput.split(",")
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);

    const customSettings = {
        focusTime,
        shortTime,
        longTime,
        blockedSites,
        allowedSites
    };

    chrome.storage.local.set({ customSettings }, () => {
        // Update DURATIONS
        DURATIONS[0] = focusTime * 60;
        DURATIONS[1] = shortTime * 60;
        DURATIONS[2] = longTime * 60;

        // Update display if timer is not running
        if (!isRunning) {
            remainingSeconds = DURATIONS[currentModeIdx];
            updateTimerDisplay();
        }

        // Send to background
        chrome.runtime.sendMessage({
            type: "UPDATE_CONFIGS",
            blockedSites,
            allowedSites
        });

        alert("Configuration saved successfully!");
        settingsPanel.style.display = "none";
        toggleSettingsBtn.innerText = "⚙ Configure Settings";
    });
});

// Dismiss alarm button click listener
const dismissAlarmBtn = document.getElementById("dismiss-alarm-btn");
if (dismissAlarmBtn) {
    dismissAlarmBtn.addEventListener("click", () => {
        // Send stop alarm message to silence beep audios
        chrome.runtime.sendMessage({ type: "STOP_ALARM" });
        
        // Cycle mode: if focus completed, shift to Short Break. If break completed, switch back to Focus.
        const nextModeIdx = currentModeIdx === 0 ? 1 : 0;
        switchMode(nextModeIdx);
        
        // Hide the banner
        const alarmBanner = document.getElementById("alarm-banner");
        if (alarmBanner) alarmBanner.style.display = "none";
    });
}

