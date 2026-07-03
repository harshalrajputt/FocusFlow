// Bridge messages from the web app page to the extension background script
window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.source === "focusflow-webapp") {
        chrome.runtime.sendMessage(event.data, (response) => {
            if (chrome.runtime.lastError) return;
            if (response) {
                window.postMessage({ source: "focusflow-extension", ...response }, "*");
            }
        });
    }
});

// Bridge messages from the extension background/popup script to the web app page
chrome.runtime.onMessage.addListener((message) => {
    window.postMessage({ source: "focusflow-extension", ...message }, "*");
    
    // Also update our floating timer overlay
    if (message.type === "TIMER_TICK" && message.state) {
        updateFloatingTimer(message.state);
    }
    return true;
});

// Helper to extract clean domain from inputs
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

// Update floating timer UI
function updateFloatingTimer(state) {
    if (!state.isRunning || state.remainingSeconds <= 0) {
        removeFloatingTimer();
        return;
    }

    const currentUrl = window.location.href;
    const isAppPage = currentUrl.includes("localhost:") || currentUrl.includes("focus-flow-flame-five.vercel.app");
    if (isAppPage) {
        removeFloatingTimer();
        return;
    }

    let isAllowed = true;
    if (state.allowedSites && state.allowedSites.length > 0) {
        try {
            const domain = window.location.hostname.replace("www.", "").toLowerCase();
            isAllowed = state.allowedSites.some(site => {
                const cleanSite = getDomainFromInput(site);
                if (!cleanSite) return false;
                const primaryDomain = cleanSite.split('.')[0];
                return domain.includes(cleanSite) || 
                       cleanSite.includes(domain) || 
                       (primaryDomain.length > 2 && domain.includes(primaryDomain));
            });
        } catch (e) {
            isAllowed = false;
        }
    }

    if (!isAllowed) {
        removeFloatingTimer();
        return;
    }

    showFloatingTimer(state.remainingSeconds, state.currentModeIdx);
}

function showFloatingTimer(remainingSeconds, modeIdx) {
    let timerEl = document.getElementById("focusflow-floating-timer");
    if (!timerEl) {
        timerEl = document.createElement("div");
        timerEl.id = "focusflow-floating-timer";
        
        // CSS Style Injection
        const style = document.createElement("style");
        style.id = "focusflow-floating-timer-styles";
        style.innerHTML = `
            #focusflow-floating-timer {
                position: fixed !important;
                top: 16px !important;
                right: 16px !important;
                z-index: 2147483647 !important;
                font-family: system-ui, -apple-system, sans-serif !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                color: rgba(255, 255, 255, 0.95) !important;
                background: rgba(15, 23, 42, 0.85) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 20px !important;
                padding: 6px 12px !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                user-select: none !important;
                pointer-events: none !important;
                transition: opacity 0.3s ease !important;
                opacity: 0;
            }
            #focusflow-floating-timer.show {
                opacity: 1;
            }
            .focusflow-indicator {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                display: inline-block;
            }
            .focusflow-indicator.focus {
                background-color: #ef4444;
                box-shadow: 0 0 8px #ef4444;
                animation: focusflow-pulse 2s infinite;
            }
            .focusflow-indicator.break {
                background-color: #10b981;
                box-shadow: 0 0 8px #10b981;
                animation: focusflow-pulse 2s infinite;
            }
            @keyframes focusflow-pulse {
                0% { transform: scale(0.95); opacity: 0.5; }
                50% { transform: scale(1.15); opacity: 1; }
                100% { transform: scale(0.95); opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(timerEl);
        
        // Trigger reflow for transition
        setTimeout(() => timerEl.classList.add("show"), 10);
    }

    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
    const secs = String(remainingSeconds % 60).padStart(2, "0");
    const modeLabel = modeIdx === 0 ? "Focus" : "Break";
    const indicatorClass = modeIdx === 0 ? "focus" : "break";

    timerEl.innerHTML = `
        <span class="focusflow-indicator ${indicatorClass}"></span>
        <span>⏱️ ${modeLabel}: ${mins}:${secs}</span>
    `;
}

function removeFloatingTimer() {
    const timerEl = document.getElementById("focusflow-floating-timer");
    const styleEl = document.getElementById("focusflow-floating-timer-styles");
    if (timerEl) {
        timerEl.classList.remove("show");
        setTimeout(() => {
            timerEl.remove();
            if (styleEl) styleEl.remove();
        }, 300);
    }
}

// Initial state sync on content script load
chrome.runtime.sendMessage({ type: "GET_TIMER_STATE" }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.state) {
        updateFloatingTimer(response.state);
    }
});
