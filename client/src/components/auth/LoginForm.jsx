import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { loginUser } from "../../services/authService";

export default function LoginForm() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await loginUser(formData);

            console.log(response.data);

            localStorage.setItem(
                "token",
                response.data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

            navigate("/dashboard");

        } catch (error) {
            console.log(error.response?.data);

            alert(
                error.response?.data?.message ||
                "Login Failed"
            );
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            <div>
                <label className="block text-sm text-slate-300 mb-2">
                    Email
                </label>

                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm text-slate-300 mb-2">
                    Password
                </label>

                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                />
            </div>

            <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition rounded-lg text-white font-medium"
            >
                Login
            </button>

            <p className="text-center text-slate-400 text-sm">
                Don't have an account?{" "}
                <Link
                    to="/register"
                    className="text-blue-400 hover:text-blue-300"
                >
                    Sign Up
                </Link>
            </p>

        </form>
    );
}