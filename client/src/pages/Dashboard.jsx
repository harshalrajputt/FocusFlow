import { useNavigate } from "react-router-dom";


export default function Dashboard() {
    const navigate = useNavigate();

    const user = JSON.parse(
        localStorage.getItem("user")
    );

    const handleLogout = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
    };
    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">

            <h1 className="text-3xl font-bold">
                Welcome {user?.name}
            </h1>

            <p className="mt-2 text-slate-400">
                FocusFlow Dashboard
            </p>
            <button
                onClick={handleLogout}
                className="mt-6 px-4 py-2 bg-red-600 rounded"
            >
                Logout
            </button>
        </div>
    );
}