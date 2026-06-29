import axios from "axios";

const API = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/pods`,
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Core Pod Operations ──────────────────────────────────────────────────────
export const createPod = (podData) => API.post("/", podData);
export const getUserPods = () => API.get("/");
export const getPodDetails = (podId) => API.get(`/${podId}`);
export const inviteMember = (podId, toUserId) => API.post(`/${podId}/invite`, { toUserId });
export const getPendingInvites = () => API.get("/invites");
export const respondToInvite = (inviteId, accept) => API.post(`/invites/${inviteId}/respond`, { accept });
export const leavePod = (podId) => API.post(`/${podId}/leave`);
export const sendNudge = (podId, toUserId, nudgeType) => API.post(`/${podId}/nudge`, { toUserId, nudgeType });
export const createChallenge = (podId, challengeData) => API.post(`/${podId}/challenges`, challengeData);

// ─── Session Reactions ────────────────────────────────────────────────────────
export const reactToActivity = (podId, activityId, emoji, toggle = false) =>
    API.post(`/${podId}/activities/${activityId}/react`, { emoji, toggle });

// ─── Weekly Report ────────────────────────────────────────────────────────────
export const getWeeklyReport = (podId) => API.get(`/${podId}/weekly-report`);

// ─── Group Sprint Rooms ───────────────────────────────────────────────────────
export const startSprint = (podId, duration) => API.post(`/${podId}/sprints`, { duration });
export const joinSprint = (podId, sprintId) => API.post(`/${podId}/sprints/${sprintId}/join`);
export const getActiveSprint = (podId) => API.get(`/${podId}/sprints/active`);

// ─── Rival Pods ───────────────────────────────────────────────────────────────
export const challengeRival = (podId, rivalPodId) => API.post(`/${podId}/rival-challenge`, { rivalPodId });
export const respondToRivalChallenge = (rivalryId, accept) => API.post(`/rivalries/${rivalryId}/respond`, { accept });
export const getRivalryStatus = (podId) => API.get(`/${podId}/rivalry`);
