import { useState, useEffect } from "react";
import Breadcrumb from "../components/BreadCrumb";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { userAPI, mentorAPI, menteeAPI } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";

import Card from "../components/Card";
import mentorImg from "../assets/mentor.webp";
import menteeImg from "../assets/mentee.jpg";

import "../App.css";

const SignUp = () => {
  usePageTitle("Choose your role");
  const navigate = useNavigate();
  const { user, userProfile, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user already has a complete profile on mount
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!userProfile) return;

      try {
        if (userProfile.role === "mentor") {
          await mentorAPI.getMe();
          // Has complete mentor profile, redirect to app
          navigate("/app/home");
        } else if (userProfile.role === "mentee") {
          await menteeAPI.getMe();
          // Has complete mentee profile, redirect to app
          navigate("/app/home");
        }
      } catch (err) {
        // Profile doesn't exist (404), stay on signup page to choose role
        if (err.status !== 404) {
          console.error("Error checking existing profile:", err);
        }
      }
    };

    checkExistingProfile();
  }, [userProfile, navigate]);

  const handleRoleSelection = async (role) => {
    setLoading(true);
    setError(null);

    try {
      // Create user profile with selected role in backend
      await userAPI.updateMe({
        full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
        role: role,
      });

      // Refresh the user profile in auth context
      await refreshProfile();

      // Store role in localStorage as backup
      localStorage.setItem("userRole", role);

      // Check if role-specific profile already exists
      try {
        if (role === "mentor") {
          await mentorAPI.getMe();
          // Profile exists, skip onboarding and go straight to app
          navigate("/app/home");
        } else {
          await menteeAPI.getMe();
          // Profile exists, skip onboarding and go straight to app
          navigate("/app/home");
        }
      } catch (profileError) {
        // Profile doesn't exist (404), go to onboarding
        if (profileError.status === 404) {
          navigate(role === "mentor" ? "/signup/mentor" : "/signup/mentee");
        } else {
          throw profileError;
        }
      }
    } catch (err) {
      console.error("Error setting role:", err);
      const msg = err.message || "Failed to set role. Please try again.";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <div className="sign-up-page">
      <Breadcrumb />
      <div className="role-page">
        <h1 className="role-title">Choose Your Role</h1>

        {user && (
          <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
            Signed in as: {user.email}
          </p>
        )}

        {error && (
          <div style={{ color: "red", marginBottom: "1rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <div className="role-card-container">
          <Card
            title="Mentor"
            image={mentorImg}
            onClick={() => !loading && handleRoleSelection("mentor")}
          />

          <Card
            title="Mentee"
            image={menteeImg}
            onClick={() => !loading && handleRoleSelection("mentee")}
          />
        </div>

        {loading && (
          <p style={{ textAlign: "center", marginTop: "1rem" }}>
            Setting up your profile...
          </p>
        )}

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={handleSignOut}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
