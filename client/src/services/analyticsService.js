import axios from "axios";

const API = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/analytics`,
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getInsights = () => {
    return API.get("/insights");
};

export const applyRecommendation = (recType, value) => {
    return API.post("/recommend", { recType, value });
};
