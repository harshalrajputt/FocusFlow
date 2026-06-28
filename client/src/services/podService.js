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

export const createPod = (podData) => {
    return API.post("/", podData);
};

export const getUserPods = () => {
    return API.get("/");
};

export const getPodDetails = (podId) => {
    return API.get(`/${podId}`);
};

export const inviteMember = (podId, toUserId) => {
    return API.post(`/${podId}/invite`, { toUserId });
};

export const getPendingInvites = () => {
    return API.get("/invites");
};

export const respondToInvite = (inviteId, accept) => {
    return API.post(`/invites/${inviteId}/respond`, { accept });
};

export const leavePod = (podId) => {
    return API.post(`/${podId}/leave`);
};

export const sendNudge = (podId, toUserId, nudgeType) => {
    return API.post(`/${podId}/nudge`, { toUserId, nudgeType });
};

export const createChallenge = (podId, challengeData) => {
    return API.post(`/${podId}/challenges`, challengeData);
};
