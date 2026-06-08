import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/auth",
});

export const registerUser = (userData) => {
    return API.post("/register", userData);
};

export const loginUser = (userData) => {
    return API.post("/login", userData);
};