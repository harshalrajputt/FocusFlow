import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Goals ───────────────────────────────────────────────────────────────────
export const getGoals    = (params) => API.get("/goals", { params });
export const createGoal  = (data)   => API.post("/goals", data);
export const updateGoal  = (id, data) => API.put(`/goals/${id}`, data);
export const deleteGoal  = (id)     => API.delete(`/goals/${id}`);
