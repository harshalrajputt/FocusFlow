import createAPI from "./apiClient";
const API = createAPI();

export const transformNotes = (data, customGroqKey) => {
    const headers = {};
    if (customGroqKey) headers["x-groq-key"] = customGroqKey;
    return API.post("/ai/transform-notes", data, { headers });
};
