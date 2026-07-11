import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Parse user from localStorage to check onboarding status
  let onboardingCompleted = false;
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    onboardingCompleted = !!user.onboardingCompleted;
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
  }

  // If onboarding is not completed, redirect to /onboarding (unless we're already there)
  if (!onboardingCompleted && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If onboarding is completed and we try to go to /onboarding, redirect to /dashboard
  // unless we are explicitly in edit mode (e.g. /onboarding?edit=true)
  if (onboardingCompleted && location.pathname === "/onboarding" && new URLSearchParams(location.search).get("edit") !== "true") {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
}