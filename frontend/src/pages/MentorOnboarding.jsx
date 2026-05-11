// src/pages/MentorOnboarding.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { mentorAPI, interestsAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { usePageTitle } from "../lib/usePageTitle";
import ImageUpload from "../components/ImageUpload";
import "../App.css";
import logo from "../assets/logo.png";

const JOB_TITLE_MAX = 80;

const MentorOnboarding = () => {
  usePageTitle("Mentor onboarding");
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [availableInterests, setAvailableInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    industry: "",
    job_title: "",
    help_types_offered: [],
    max_requests_per_week: 5,
    interest_ids: [],
    profile_picture_url: "",
  });

  // Check if profile already exists and fetch interests
  useEffect(() => {
    const checkProfileAndFetchInterests = async () => {
      try {
        // Check if mentor profile already exists
        await mentorAPI.getMe();
        // Profile exists, redirect to app home
        navigate("/app/home");
      } catch (err) {
        // Profile doesn't exist (404), proceed with onboarding
        if (err.status === 404) {
          // Fetch interests for the form
          try {
            const interests = await interestsAPI.getAll();
            setAvailableInterests(interests);
          } catch (interestErr) {
            console.error("Error fetching interests:", interestErr);
          }
        } else {
          console.error("Error checking mentor profile:", err);
        }
      }
    };
    checkProfileAndFetchInterests();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleHelpTypeChange = (helpType) => {
    setFormData((prev) => ({
      ...prev,
      help_types_offered: prev.help_types_offered.includes(helpType)
        ? prev.help_types_offered.filter((type) => type !== helpType)
        : [...prev.help_types_offered, helpType],
    }));
  };

  const handleInterestChange = (interestId) => {
    setFormData((prev) => ({
      ...prev,
      interest_ids: prev.interest_ids.includes(interestId)
        ? prev.interest_ids.filter((id) => id !== interestId)
        : [...prev.interest_ids, interestId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const jobTitle = formData.job_title.trim();
    const industry = formData.industry.trim();

    if (!industry) {
      setError("Please choose an industry.");
      return;
    }
    if (jobTitle.length < 2) {
      setError("Please enter a real job title (at least 2 characters).");
      return;
    }
    if (jobTitle.length > JOB_TITLE_MAX) {
      setError(`Job title is too long (max ${JOB_TITLE_MAX} characters).`);
      return;
    }
    if (formData.help_types_offered.length === 0) {
      setError("Pick at least one type of help you can offer.");
      return;
    }
    if (formData.interest_ids.length < 3) {
      setError("Select at least 3 interests so we can match you well.");
      return;
    }
    if (
      formData.max_requests_per_week < 1 ||
      formData.max_requests_per_week > 20
    ) {
      setError("Max requests per week should be between 1 and 20.");
      return;
    }

    setLoading(true);
    try {
      await mentorAPI.createMe({
        ...formData,
        job_title: jobTitle,
        industry,
        is_active: true,
      });

      await refreshProfile();
      toast.success("Mentor profile created");
      navigate("/app/home");
    } catch (err) {
      console.error("Error creating mentor profile:", err);
      const msg = err.message || "Failed to create mentor profile";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const helpTypes = [
    { value: "resume_review", label: "Resume Review" },
    { value: "mock_interview", label: "Mock Interview" },
    { value: "career_advice", label: "Career Advice" },
    { value: "social_advice", label: "Social Advice" },
  ];

  const industries = [
    "Engineering",
    "Natural Sciences",
    "Formal Sciences",
    "Health Sciences",
    "Social Sciences",
    "Humanities",
    "Arts",
    "Business",
    "Education",
    "Law",
    "Communication & Media",
    "Architecture & Design",
  ];

  return (
    <div className="onboarding-page">
      <h1>Mentor Onboarding</h1>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem", textAlign: "center" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="onboarding-form">
        <label>
          Industry
          <select
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value="">Select an industry...</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </label>

        <label>
          Job Title
          <input
            type="text"
            name="job_title"
            value={formData.job_title}
            onChange={handleChange}
            placeholder="e.g., Senior Software Engineer"
            required
          />
        </label>

        <label>
          Profile Picture
          <ImageUpload
            currentImageUrl={formData.profile_picture_url}
            onUploadComplete={(url) => {
              setFormData({...formData, profile_picture_url: url});
            }}
            onError={(err) => setError(err)}
            maxSizeMB={2}
          />
          <small style={{ color: "#666", fontSize: "0.85rem", marginTop: "0.25rem", display: "block" }}>
            Optional: Upload a profile picture (max 2MB, recommended for better visibility)
          </small>
        </label>

        <label>
          Help Types I Can Offer (Select all that apply)
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
            {helpTypes.map((type) => (
              <label key={type.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={formData.help_types_offered.includes(type.value)}
                  onChange={() => handleHelpTypeChange(type.value)}
                />
                {type.label}
              </label>
            ))}
          </div>
        </label>

        <label>
          Max Requests Per Week
          <input
            type="number"
            name="max_requests_per_week"
            value={formData.max_requests_per_week}
            onChange={handleChange}
            min="1"
            max="20"
            required
          />
        </label>

        <label>
          My Interests (Select at least 3)
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.5rem",
            marginTop: "0.5rem",
            maxHeight: "200px",
            overflowY: "auto",
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px"
          }}>
            {availableInterests.map((interest) => (
              <label key={interest.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={formData.interest_ids.includes(interest.id)}
                  onChange={() => handleInterestChange(interest.id)}
                />
                <span style={{ fontSize: "0.9rem" }}>{interest.name}</span>
              </label>
            ))}
          </div>
        </label>

        <button
          type="submit"
          className="submit-btn"
          disabled={loading || formData.help_types_offered.length === 0 || formData.interest_ids.length < 3}
        >
          {loading ? "Creating Profile..." : "Complete Onboarding"}
        </button>
      </form>
      <img src={logo} alt="Logo" className="onboarding-logo" />
    </div>
  );
};

export default MentorOnboarding;
