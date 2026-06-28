import axios from "axios";

const API = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/profile`,
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getProfile = () => {
    return API.get("/");
};

export const upsertProfile = (profileData) => {
    return API.put("/", profileData);
};

export const completeOnboarding = () => {
    return API.put("/complete");
};
