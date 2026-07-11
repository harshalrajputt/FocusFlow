import createAPI from "./apiClient";
const API = createAPI("analytics");

export const getInsights = () => API.get("/insights");
export const applyRecommendation = (recType, value) => API.post("/recommend", { recType, value });
