import createAPI from "./apiClient";
const API = createAPI();

// ─── Focus Sessions ───────────────────────────────────────────────────────────
export const logFocusSession  = (data)   => API.post("/focus", data);
export const getFocusSessions = (params) => API.get("/focus", { params });
export const getFocusSummary  = ()       => API.get("/focus/summary");
export const updateSessionFeedback = (sessionId, data) => API.put(`/focus/${sessionId}/feedback`, data);

// ─── Real-time Presence ───────────────────────────────────────────────────────
export const updatePresence = (active, taskLabel = "") =>
    API.put("/focus/presence", { active, taskLabel });
