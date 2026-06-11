import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/auth",
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const registerUser = (userData) => {
    return API.post("/register", userData);
};

export const loginUser = (userData) => {
    return API.post("/login", userData);
};

export const updateUserProfile = (profileData) => {
    return API.put("/profile", profileData);
};

export const updateUserPassword = (passwordData) => {
    return API.put("/password", passwordData);
};

export const forgotPassword = (emailData) => {
    return API.post("/forgot-password", emailData);
};

export const resetPassword = (resetData) => {
    return API.post("/reset-password", resetData);
};