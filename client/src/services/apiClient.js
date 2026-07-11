import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function createAPI(path = "") {
    const API = axios.create({ baseURL: path ? `${BASE}/${path}` : BASE });
    API.interceptors.request.use((config) => {
        const token = localStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
    return API;
}
