import createAPI from "./apiClient";
const API = createAPI("auth");

export const registerUser = (userData) => API.post("/register", userData);
export const loginUser = (userData) => API.post("/login", userData);
export const updateUserProfile = (profileData) => API.put("/profile", profileData);
export const updateUserPassword = (passwordData) => API.put("/password", passwordData);
export const forgotPassword = (emailData) => API.post("/forgot-password", emailData);
export const resetPassword = (resetData) => API.post("/reset-password", resetData);
export const searchUsers = (query) => API.get(`/search?q=${query}`);