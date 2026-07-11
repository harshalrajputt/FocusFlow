import createAPI from "./apiClient";
const API = createAPI();

export const getTasks    = (params) => API.get("/tasks", { params });
export const getTaskById = (id)     => API.get(`/tasks/${id}`);
export const createTask  = (data)   => API.post("/tasks", data);
export const updateTask  = (id, data) => API.put(`/tasks/${id}`, data);
export const deleteTask  = (id)     => API.delete(`/tasks/${id}`);
