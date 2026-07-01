# FocusFlow — Bug Fix Guide (All 10 Issues)

Each fix below tells you: what's actually wrong, which file(s) to touch, and exactly what to change.

---

## Bug 1 — Dashboard shows "1 completed" but Analytics shows "0 completed sessions"

**Root cause:** These two screens are counting different things from different collections. Dashboard likely queries the `Task` model (completed tasks), while Analytics queries the `FocusSession` model (completed Pomodoro sessions). They are not the same number and should not be labeled the same way.

**Files to touch:** `client/src/pages/Dashboard.jsx`, `client/src/pages/Analytics.jsx`

**Fix:**
1. In `Dashboard.jsx`, find the stat card labeled "Completed." Check what API endpoint it calls — it's almost certainly `/api/tasks?status=completed` or a tasks summary. Rename the label to **"Tasks Done"** so it's unambiguous.
2. In `Analytics.jsx`, the sessions count calls `/api/focus-sessions` or a summary endpoint. Rename its label to **"Sessions Completed"**.
3. If you want a single unified number, add a `GET /api/stats/today` backend route that returns both counts in one response, and use that on both pages. But renaming the labels is the fastest fix and actually more informative — a student should know the difference between tasks done and focus sessions completed.

---

## Bug 2 — Timer pauses when the FocusFlow tab is not active

**Root cause:** Your timer is almost certainly built with `setInterval` inside a React `useEffect`. Browsers throttle `setInterval` on inactive tabs to ~1 tick per second at best, and can suspend it entirely on battery-saving modes. This is a browser-level constraint, not a bug in your logic.

**Files to touch:** `client/src/pages/FocusSession.jsx`

**Fix — switch from tick-based to deadline-based countdown:**

Instead of decrementing a counter every second, store the session's **end time** and compute remaining time on each tick:

```javascript
// On session start:
const endTime = Date.now() + durationInMs;
localStorage.setItem('focusEndTime', endTime); // persist across tab switches

// In your interval (can even be 500ms for smoother display):
const interval = setInterval(() => {
  const remaining = Math.max(0, localStorage.getItem('focusEndTime') - Date.now());
  setTimeLeft(Math.ceil(remaining / 1000));
  if (remaining <= 0) {
    clearInterval(interval);
    handleSessionComplete();
  }
}, 500);
```

Now switching tabs doesn't affect accuracy because you're always measuring against a fixed end timestamp, not counting ticks.

---

## Bug 3 — Starting a session in the web app doesn't update the extension timer

**Root cause:** The web app and extension have no shared real-time state channel. The extension's popup reads from `chrome.storage.local`, and the web app never writes there. They're two isolated worlds.

**Files to touch:** `client/src/pages/FocusSession.jsx`, `extension/background.js`, `extension/popup.js`

**Fix — use the backend as the shared source of truth:**

1. When a session starts in the web app, your backend already sets `activeSessionStart` and `activeTaskLabel` on the User model (from your ER diagram). Use this.
2. In `extension/background.js`, add a polling loop (every 10-15 seconds) that calls `GET /api/users/me` or a dedicated `GET /api/sessions/active` endpoint, checks `activeSessionStart`, and if a session is active there that the extension didn't start, syncs timer state into `chrome.storage.local`.
3. In `extension/popup.js`, when the popup opens, always check `chrome.storage.local` first — if there's an active session from the backend, display the remaining time rather than a fresh timer.

```javascript
// extension/background.js — add polling
async function syncSessionFromBackend() {
  const { token } = await chrome.storage.local.get('token');
  if (!token) return;
  const res = await fetch('https://your-api.com/api/sessions/active', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.activeSessionStart) {
    await chrome.storage.local.set({
      timerRunning: true,
      sessionStartedAt: data.activeSessionStart,
      sessionDuration: data.sessionDuration,
      activeTaskLabel: data.activeTaskLabel,
      source: 'webapp' // flag so extension knows it didn't start this
    });
  }
}
// Call on startup and every 15s
chrome.alarms.create('syncSession', { periodInMinutes: 0.25 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncSession') syncSessionFromBackend();
});
```

---

## Bug 4 — Extension lets you start a second conflicting session while one is already running

**Root cause:** The extension's "Start Session" button in `popup.js` doesn't check whether a session is already active before starting a new one. The fix is a guard check before allowing a start.

**Files to touch:** `extension/popup.js`, `server/controllers/focusSession.controller.js`

**Fix — two-layer guard:**

Layer 1 (extension, client-side): Before starting a session in the popup, read `chrome.storage.local` first. If `timerRunning === true`, replace the Start button with a "Session already running — view it" message and a link to the web app.

```javascript
// extension/popup.js
document.getElementById('startBtn').addEventListener('click', async () => {
  const { timerRunning } = await chrome.storage.local.get('timerRunning');
  if (timerRunning) {
    showMessage('You already have an active session! Complete it first.');
    return;
  }
  // proceed to start
});
```

Layer 2 (backend): In your session-start controller, check if `user.activeSessionStart` is already set. If it is, return a `409 Conflict` response instead of creating a new session. The extension and web app both respect this.

---

## Bug 5 — Web app timer has no configurable durations (only extension does)

**Root cause:** A simple missing UI feature — the extension exposes duration inputs but `FocusSession.jsx` hardcodes 25/5/15 minutes.

**Files to touch:** `client/src/pages/FocusSession.jsx`

**Fix:** Add a small duration settings panel above or beside the timer ring. Use component-level state for the three durations (focus, short break, long break), persist them to `localStorage` so they survive page reloads, and read them when the timer mode changes:

```javascript
const [durations, setDurations] = useState(() => {
  const saved = localStorage.getItem('timerDurations');
  return saved ? JSON.parse(saved) : { focus: 25, shortBreak: 5, longBreak: 15 };
});

const handleDurationChange = (mode, value) => {
  const updated = { ...durations, [mode]: Number(value) };
  setDurations(updated);
  localStorage.setItem('timerDurations', JSON.stringify(updated));
};
```

Add three number inputs (min=1, max=120) somewhere visible on the page. Optionally sync them to the extension via the backend so both stay in sync.

---

## Bug 6 — "Log Distraction" button purpose is unclear

**Root cause:** Not a code bug — a UX communication problem. The button increments `interruptions` on the active `FocusSession` document, which your ML service later uses as a behavioral signal. Students don't know this.

**Files to touch:** `client/src/pages/FocusSession.jsx`

**Fix — better copy and a tooltip:**

1. Rename the button from **"Log Distraction"** or **"+1 Distraction"** to something like **"Got Distracted"** or **"I Lost Focus"**.
2. Add a small tooltip or subtitle directly under it: *"Tap whenever you get pulled away — helps your AI coach learn your patterns."*
3. Optionally show a running count in the button itself: `"😵 Lost Focus ×3"` — seeing the number grow during a session gives students real-time feedback on how well they're staying on task.

---

## Bug 7 — Timer resets to zero on page reload

**Root cause:** Timer state (time remaining, running/paused, session start) lives only in React state. A page reload destroys React state entirely.

**Files to touch:** `client/src/pages/FocusSession.jsx`

**Fix — restore from localStorage on mount (already partially needed for Bug 2's fix):**

Since Bug 2's fix stores `focusEndTime` in localStorage, Bug 7 is mostly solved at the same time. On component mount, check localStorage and reconstruct the timer:

```javascript
useEffect(() => {
  const endTime = localStorage.getItem('focusEndTime');
  const taskLabel = localStorage.getItem('focusTaskLabel');
  if (endTime && Date.now() < Number(endTime)) {
    // Session was running — restore it
    setIsRunning(true);
    setSelectedTask(taskLabel);
    // timer interval will compute remaining time from endTime
  } else if (endTime) {
    // Session ended while tab was closed — clean up and trigger post-session modal
    localStorage.removeItem('focusEndTime');
    setShowPostSessionModal(true);
  }
}, []);
```

Also clear localStorage cleanly when a session completes normally or is cancelled.

---

## Bug 8 — YouTube logged as "Distracting" even when it's in the Allowed Work URLs list

**Root cause:** The whitelist in the extension controls *blocking* (whether a tab gets redirected). But the telemetry *categorization* that labels domains as Productive/Distracting/Neutral happens server-side in `server/controllers/websiteUsage.controller.js` against a hardcoded list. These two lists are completely separate — adding YouTube to the extension whitelist doesn't touch the server-side category map.

**Files to touch:** `server/controllers/websiteUsage.controller.js`, `extension/background.js`, your backend user settings model/schema.

**Fix — user-defined whitelist must feed into server-side categorization:**

1. Save the user's allowed URLs list from the extension to the backend. Add a `userWhitelist: [String]` field to the `UserProfile` model (or a standalone settings document) and expose a `PUT /api/settings/whitelist` endpoint.
2. When the extension whitelist changes, POST it to the backend.
3. In your telemetry categorization logic (the function that labels domains), before checking the hardcoded lists, first check if the incoming domain matches any entry in `user.userWhitelist`. If it does, categorize it as `Productive` (or a new category: `Approved`) instead of `Distracting`.

```javascript
// server/controllers/websiteUsage.controller.js
function categorizeDomain(domain, userWhitelist = []) {
  // User-defined allowed list takes priority
  if (userWhitelist.some(w => domain.includes(w))) return 'productive';
  
  const distracting = ['youtube.com', 'instagram.com', 'reddit.com', ...];
  const productive = ['github.com', 'leetcode.com', 'stackoverflow.com', ...];
  
  if (distracting.includes(domain)) return 'distracting';
  if (productive.includes(domain)) return 'productive';
  return 'neutral';
}
```

---

## Bug 9 — Timer keeps running when the student is on the FocusFlow tab itself

**Root cause:** The extension's domain tracker logs time on every active tab including `focus-flow-flame-five.vercel.app`. Since this domain doesn't appear in the productive/distracting lists, it gets classified as neutral — but more importantly, the session timer ticking away while a student is looking at their dashboard (not studying) inflates session metrics.

**Files to touch:** `extension/background.js`, `server/controllers/websiteUsage.controller.js`

**Fix — two parts:**

1. In `extension/background.js`, add your own app's domain (`focus-flow-flame-five.vercel.app`, and `localhost` for dev) to a hardcoded skip list. When the active tab is the FocusFlow app itself, don't log telemetry time for it — it's neither study time nor distraction time.

```javascript
const APP_DOMAINS = ['focus-flow-flame-five.vercel.app', 'localhost'];

function shouldSkipDomain(domain) {
  return APP_DOMAINS.some(d => domain.includes(d));
}
```

2. Decide whether the timer should pause when the student is on the FocusFlow tab. If you want it to pause: in `background.js`, when the active tab switches to the app domain, dispatch a pause event to `chrome.storage.local` that `FocusSession.jsx` listens to via the `storage` event. If you want it to continue (student may be checking schedule while studying), just skip telemetry logging but keep the timer running.

---

## Bug 10 — No enforcement on disallowed sites without the extension

**Root cause:** This is a genuine browser security constraint. A web page cannot control what other tabs open in the browser — only a browser extension can. Without the extension, FocusFlow has no enforcement capability, and this is fundamentally unsolvable at the application layer.

**Files to touch:** `client/src/pages/FocusSession.jsx`, `server/controllers/focusSession.controller.js`

**Fix — honest degraded-mode with surface-level deterrents:**

Since you can't enforce without the extension, handle this gracefully:

1. **Detect extension presence.** When the extension is installed, it can set a flag via `window.postMessage` or inject a DOM attribute that the web app can read. On session start, check for this flag.
2. **If extension is not detected**, show a non-blocking warning banner inside the timer screen: *"Extension not active — blocking and telemetry are paused. Your session will still be logged, but we can't enforce site rules."*
3. **Don't let this silently inflate Focus Scores.** In the session-complete handler, if the session was started without extension telemetry (tracked via a `telemetryAvailable: boolean` flag you store on the FocusSession document), exclude that session's duration from the Focus Score calculation or mark it as unverified. This keeps your ML data honest.
4. **Prompt, don't block.** After the session ends without the extension, show a one-tap prompt: *"Add the FocusFlow extension to verify future sessions and track real web activity."*

The goal is honest communication and data integrity — not pretending enforcement is happening when it isn't.

---

## Fix priority order

| Priority | Bug | Reason |
|---|---|---|
| 1 | Bug 2 (timer pauses on tab switch) | Breaks the core loop — students can't trust the timer |
| 2 | Bug 7 (reload resets timer) | Same root cause as Bug 2, fixed at the same time |
| 3 | Bug 4 (duplicate sessions) | Data integrity — bad sessions corrupt ML training data |
| 4 | Bug 8 (YouTube miscategorized) | Silent inaccuracy that damages Focus Score trust |
| 5 | Bug 3 (extension not syncing) | Big UX gap, medium code effort |
| 6 | Bug 1 (dashboard/analytics mismatch) | Confusing but not harmful — mostly a label fix |
| 7 | Bug 5 (no configurable durations) | Feature gap, easy to add |
| 8 | Bug 9 (app tab tracked as session) | Inflates metrics silently |
| 9 | Bug 6 (Log Distraction unclear) | UX polish — 5-minute copy change |
| 10 | Bug 10 (no enforcement without extension) | By-design constraint — add honest degraded mode |

Bugs 2 and 7 share a fix (deadline-based timer + localStorage), so they're a single PR. Bugs 1, 6 and 9 are each under an hour. Bug 10 requires no new infrastructure — just honest UI copy and a flag on the session document.
