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

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const getTasks    = (params) => API.get("/tasks", { params });
export const getTaskById = (id)     => API.get(`/tasks/${id}`);
export const createTask  = (data)   => API.post("/tasks", data);
export const updateTask  = (id, data) => API.put(`/tasks/${id}`, data);
export const deleteTask  = (id)     => API.delete(`/tasks/${id}`);
