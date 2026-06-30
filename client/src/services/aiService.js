import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const transformNotes = (data, customGroqKey) => {
    const headers = {};
    if (customGroqKey) {
        headers["x-groq-key"] = customGroqKey;
    }
    return API.post("/ai/transform-notes", data, { headers });
};
