import createAPI from "./apiClient";
const API = createAPI();

export const getNotifications = () => API.get("/notifications");
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const clearNotification = (id) => API.delete(`/notifications/${id}`);
