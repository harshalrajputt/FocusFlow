import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api",
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Focus Sessions ───────────────────────────────────────────────────────────
export const logFocusSession  = (data)   => API.post("/focus", data);
export const getFocusSessions = (params) => API.get("/focus", { params });
export const getFocusSummary  = ()       => API.get("/focus/summary");
