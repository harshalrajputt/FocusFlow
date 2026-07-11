import createAPI from "./apiClient";
const API = createAPI("profile");

export const getProfile = () => API.get("/");
export const upsertProfile = (profileData) => API.put("/", profileData);
export const completeOnboarding = () => API.put("/complete");
