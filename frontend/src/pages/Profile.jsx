import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { userAPI, mentorAPI, menteeAPI } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import ImageUpload from "../components/ImageUpload";
import MobileNav from "../components/MobileNav";
import "../App.css";

const Profile = () => {
  usePageTitle("Profile");
  const navigate = useNavigate();
  const { user, userProfile, signOut, refreshProfile } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({
    full_name: "",
    role: "",
  });
  const [roleProfile, setRoleProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editProfilePicture, setEditProfilePicture] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        // Get user profile
        const userProf = await userAPI.getMe();
        setProfile({
          full_name: userProf.full_name,
          role: userProf.role,
        });

        // Get role-specific profile
        if (userProf.role === "mentor") {
          const mentorProf = await mentorAPI.getMe();
          setRoleProfile(mentorProf);
          setProfilePictureUrl(mentorProf.profile_picture_url || "");
        } else if (userProf.role === "mentee") {
          const menteeProf = await menteeAPI.getMe();
          setRoleProfile(menteeProf);
          setProfilePictureUrl(menteeProf.profile_picture_url || "");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      toast.error("Error signing out: " + err.message);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    setError(null);

    try {
      // Update user profile
      await userAPI.updateMe({
        full_name: profile.full_name,
        role: profile.role,
      });

      // Refresh profile in auth context
      await refreshProfile();

      setEditMode(false);
      toast.success("Profile updated");
    } catch (err) {
      console.error("Error updating profile:", err);
      const msg = err.message || "Failed to update profile";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="profile-page">
        <h1>My Profile</h1>
        <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1>My Profile</h1>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem", textAlign: "center" }}>
          {error}
        </div>
      )}

      <div className="profile-info">
        {roleProfile && (
          <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
            {editProfilePicture ? (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>Update Profile Picture</h3>
                <ImageUpload
                  currentImageUrl={profilePictureUrl}
                  onUploadComplete={async (url) => {
                    setSaving(true);
                    setError(null);
                    try {
                      // Update database with new URL
                      if (profile.role === "mentor") {
                        await mentorAPI.updateMe({ profile_picture_url: url });
                      } else {
                        await menteeAPI.updateMe({ profile_picture_url: url });
                      }
                      setProfilePictureUrl(url);
                      setEditProfilePicture(false);
                      toast.success("Profile picture updated");
                    } catch (err) {
                      console.error("Error updating profile:", err);
                      const msg = err.message || "Failed to update profile picture";
                      setError(msg);
                      toast.error(msg);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  onError={(err) => setError(err)}
                />
                <button
                  className="delete-btn"
                  onClick={() => setEditProfilePicture(false)}
                  disabled={saving}
                  style={{ marginTop: "1rem", fontSize: "0.9rem" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "0.5rem" }}>
                  <img
                    src={profilePictureUrl || "https://via.placeholder.com/150/cccccc/666666?text=No+Photo"}
                    alt="Profile"
                    style={{
                      width: "150px",
                      height: "150px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid #ddd"
                    }}
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/150/cccccc/666666?text=No+Photo";
                    }}
                  />
                </div>
                <button
                  className="update-btn"
                  onClick={() => setEditProfilePicture(true)}
                  style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}
                >
                  Change Picture
                </button>
              </>
            )}
          </div>
        )}

        <div>
          <strong>Name:</strong>
          {editMode ? (
            <input
              className="profile-input"
              type="text"
              name="full_name"
              value={profile.full_name}
              onChange={handleChange}
            />
          ) : (
            <span>{profile.full_name}</span>
          )}
        </div>

        <div>
          <strong>Email:</strong>
          <span>{user?.email}</span>
        </div>

        <div>
          <strong>Role:</strong>
          <span style={{ textTransform: "capitalize" }}>{profile.role}</span>
        </div>

        {roleProfile && profile.role === "mentor" && (
          <>
            <div>
              <strong>Industry:</strong>
              <span>{roleProfile.industry}</span>
            </div>
            <div>
              <strong>Job Title:</strong>
              <span>{roleProfile.job_title}</span>
            </div>
            <div>
              <strong>Help Types Offered:</strong>
              <span>{roleProfile.help_types_offered?.join(", ")}</span>
            </div>
            <div>
              <strong>Max Requests/Week:</strong>
              <span>{roleProfile.max_requests_per_week}</span>
            </div>
            <div>
              <strong>Interests:</strong>
              <span>{roleProfile.interests?.map(i => i.name).join(", ")}</span>
            </div>
          </>
        )}

        {roleProfile && profile.role === "mentee" && (
          <>
            <div>
              <strong>Industry:</strong>
              <span>{roleProfile.industry}</span>
            </div>
            <div>
              <strong>Goals:</strong>
              <span>{roleProfile.goals}</span>
            </div>
            <div>
              <strong>Background:</strong>
              <span>{roleProfile.background}</span>
            </div>
            <div>
              <strong>Help Needed:</strong>
              <span>{roleProfile.help_needed?.join(", ")}</span>
            </div>
            <div>
              <strong>Interests:</strong>
              <span>{roleProfile.interests?.map(i => i.name).join(", ")}</span>
            </div>
          </>
        )}

        <div style={{ marginTop: "1rem" }}>
          {editMode ? (
            <>
              <button
                className="update-btn"
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                className="delete-btn"
                onClick={() => setEditMode(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          ) : (
            <button className="update-btn" onClick={() => setEditMode(true)}>
              Edit Name
            </button>
          )}
        </div>
      </div>

      <button className="signout-btn" onClick={handleSignOut}>
        Sign Out
      </button>

      <MobileNav />
    </div>
  );
};

export default Profile;
