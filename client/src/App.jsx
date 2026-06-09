import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import MainLayout from "./components/layout/MainLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import FocusSession from "./pages/FocusSession";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Schedule from "./pages/Schedule";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Navigate to="/login" />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/onboarding"
            element={<Onboarding />}
          />
          <Route element={<MainLayout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/tasks"
              element={<Tasks />}
            />

            <Route
              path="/focus"
              element={<FocusSession />}
            />

            <Route
              path="/analytics"
              element={<Analytics />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

            <Route
              path="/schedule"
              element={<Schedule />}
            />

          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
