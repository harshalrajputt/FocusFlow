import createAPI from "./apiClient";
const API = createAPI();

export const getDailyWebsiteUsage = (date) => API.get("/website-usage/stats", { params: { date } });
