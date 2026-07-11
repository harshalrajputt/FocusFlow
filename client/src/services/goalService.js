import createAPI from "./apiClient";
const API = createAPI();

export const getGoals    = (params) => API.get("/goals", { params });
export const createGoal  = (data)   => API.post("/goals", data);
export const updateGoal  = (id, data) => API.put(`/goals/${id}`, data);
export const deleteGoal  = (id)     => API.delete(`/goals/${id}`);
