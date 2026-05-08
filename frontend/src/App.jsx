import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

import MentorOnboarding from "./pages/MentorOnboarding";
import MenteeOnboarding from "./pages/MenteeOnboarding";

import AppHome from "./pages/AppHome";
import Matches from "./pages/Matches";
import Messages from "./pages/Messages";

import Profile from "./pages/Profile";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route
            path="/signin"
            element={
              <PublicRoute>
                <SignIn />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <ProtectedRoute>
                <SignUp />
              </ProtectedRoute>
            }
          />

          {/* Onboarding flows - require auth but not profile */}
          <Route
            path="/signup/mentor"
            element={
              <ProtectedRoute>
                <MentorOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/signup/mentee"
            element={
              <ProtectedRoute>
                <MenteeOnboarding />
              </ProtectedRoute>
            }
          />

          {/* Post-auth App - require auth and profile */}
          <Route
            path="/app/home"
            element={
              <ProtectedRoute requireProfile={true}>
                <AppHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/matches"
            element={
              <ProtectedRoute requireProfile={true}>
                <Matches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/matches/messages/:userId"
            element={
              <ProtectedRoute requireProfile={true}>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/profile"
            element={
              <ProtectedRoute requireProfile={true}>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
