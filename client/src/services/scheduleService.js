import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/schedule",
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getSchedule = () => {
    return API.get("/");
};

export const regenerateSchedule = () => {
    return API.post("/generate");
};

export const updateSchedule = (scheduleData) => {
    return API.put("/", scheduleData);
};
