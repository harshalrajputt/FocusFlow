import createAPI from "./apiClient";
const API = createAPI("schedule");

export const getSchedule = () => API.get("/");
export const regenerateSchedule = () => API.post("/generate");
export const updateSchedule = (scheduleData) => API.put("/", scheduleData);
export const getMissedSessions = (params) => API.get("/missed-sessions", { params });
export const recoverSession = (data) => API.post("/recover", data);
export const getAdaptiveSuggestions = () => API.get("/adaptive-suggestions");
