const BACKEND_URL = "http://localhost:5000/api";

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

// Initialize
chrome.storage.local.get(["token", "timerState"], (result) => {
    if (result.token) {
        showTimerScreen(result.token);
    } else {
        showAuthScreen();
    }

    if (result.timerState) {
        restoreTimerState(result.timerState);
    } else {
        updateTimerDisplay();
    }
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

            let domains = ["youtube.com", "instagram.com", "netflix.com"]; // defaults
            rawDist.forEach(d => {
                if (domainMap[d]) {
                    domains = [...domains, ...domainMap[d]];
                }
            });
            const uniqueDomains = [...new Set(domains)];
            
            // Send blocklist to background worker
            chrome.runtime.sendMessage({
                type: "START_FOCUS",
                blockedSites: uniqueDomains
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
modeFocus.addEventListener("click", () => switchMode(0));
modeShort.addEventListener("click", () => switchMode(1));
modeLong.addEventListener("click", () => switchMode(2));

function switchMode(idx) {
    clearInterval(timerInterval);
    isRunning = false;
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
    startTimeStamp = Date.now();
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

    const targetEndTime = Date.now() + remainingSeconds * 1000;

    timerInterval = setInterval(() => {
        const left = Math.round((targetEndTime - Date.now()) / 1000);
        if (left <= 0) {
            clearInterval(timerInterval);
            remainingSeconds = 0;
            updateTimerDisplay();
            handleTimerComplete();
        } else {
            remainingSeconds = left;
            updateTimerDisplay();
        }
        saveTimerState(targetEndTime);
    }, 1000);

    saveTimerState(targetEndTime);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    playBtn.innerText = "▶";
    statusDisplay.innerText = "Timer paused";
    
    // Increment pause count in storage
    chrome.storage.local.get("sessionMetrics", (res) => {
        const metrics = res.sessionMetrics || { interruptions: 0, pauseCount: 0 };
        metrics.pauseCount = (metrics.pauseCount || 0) + 1;
        chrome.storage.local.set({ sessionMetrics: metrics });
    });

    // Stop distraction blocker
    chrome.runtime.sendMessage({ type: "STOP_FOCUS" });
    saveTimerState();
}

resetBtn.addEventListener("click", () => {
    switchMode(currentModeIdx);
});

skipBtn.addEventListener("click", () => {
    switchMode((currentModeIdx + 1) % DURATIONS.length);
});

// Timer complete - Log to backend Focus Session API
async function handleTimerComplete() {
    pauseTimer();
    
    chrome.storage.local.get(["token", "sessionMetrics"], async (res) => {
        if (!res.token) return;

        const duration = DURATIONS[currentModeIdx];
        const end = new Date();
        const start = new Date(end.getTime() - duration * 1000);
        const metrics = res.sessionMetrics || { interruptions: 0, pauseCount: 0 };

        try {
            await fetch(`${BACKEND_URL}/focus`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${res.token}`
                },
                body: JSON.stringify({
                    taskId: taskSelect.value || null,
                    sessionType: MODE_NAMES[currentModeIdx],
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
            statusDisplay.innerText = "Session completed and saved to FocusFlow!";
        } catch (err) {
            statusDisplay.innerText = "Session completed (failed to sync)";
        }

        // Reset metrics in storage
        chrome.storage.local.set({ sessionMetrics: { interruptions: 0, pauseCount: 0 } });
    });

    alert(`${MODE_NAMES[currentModeIdx]} finished!`);
    switchMode((currentModeIdx + 1) % DURATIONS.length);
}

// Timer Storage Persistence
function saveTimerState(targetEndTime = null) {
    const timerState = {
        isRunning,
        currentModeIdx,
        remainingSeconds,
        targetEndTime
    };
    chrome.storage.local.set({ timerState });
}

function restoreTimerState(state) {
    currentModeIdx = state.currentModeIdx;
    
    // Adjust active button
    [modeFocus, modeShort, modeLong].forEach((btn, i) => {
        if (i === currentModeIdx) btn.classList.add("active");
        else btn.classList.remove("active");
    });

    if (state.isRunning && state.targetEndTime) {
        const left = Math.round((state.targetEndTime - Date.now()) / 1000);
        if (left <= 0) {
            remainingSeconds = 0;
            updateTimerDisplay();
            handleTimerComplete();
        } else {
            remainingSeconds = left;
            isRunning = true;
            playBtn.innerText = "⏸";
            statusDisplay.innerText = currentModeIdx === 0 ? "⚡ Distraction blocker: active" : "Timer running";
            
            timerInterval = setInterval(() => {
                const innerLeft = Math.round((state.targetEndTime - Date.now()) / 1000);
                if (innerLeft <= 0) {
                    clearInterval(timerInterval);
                    remainingSeconds = 0;
                    updateTimerDisplay();
                    handleTimerComplete();
                } else {
                    remainingSeconds = innerLeft;
                    updateTimerDisplay();
                }
            }, 1000);
        }
    } else {
        remainingSeconds = state.remainingSeconds;
        updateTimerDisplay();
    }
}
