import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { applyAppearanceSettings } from "../../utils/theme";

export default function MainLayout() {
    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            if (user?.settings?.appearance) {
                applyAppearanceSettings(user.settings.appearance);
            } else {
                applyAppearanceSettings({
                    theme: "Light",
                    compactSidebar: false,
                    reduceMotion: false,
                    denseLayout: false
                });
            }
        } catch (e) {
            console.error("Failed to load user appearance settings", e);
        }
    }, []);

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar />
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}