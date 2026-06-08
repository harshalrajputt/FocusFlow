import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerUser } from "../../services/authService";

export default function RegisterForm() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        try {

            const response = await registerUser({
                name: formData.name,
                email: formData.email,
                password: formData.password,
            });

            console.log(response.data);

            alert("Registration Successful");

            navigate("/login");

        } catch (error) {

            console.log(error.response?.data);

            alert(
                error.response?.data?.message ||
                "Registration Failed"
            );
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            <div>
                <label className="block text-sm text-slate-300 mb-2">
                    Full Name
                </label>

                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                />
            </div>

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
                    placeholder="Create password"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm text-slate-300 mb-2">
                    Confirm Password
                </label>

                <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                />
            </div>

            <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition rounded-lg text-white font-medium"
            >
                Create Account
            </button>

            <p className="text-center text-slate-400 text-sm">
                Already have an account?{" "}
                <Link
                    to="/login"
                    className="text-blue-400 hover:text-blue-300"
                >
                    Login
                </Link>
            </p>

        </form>
    );
}