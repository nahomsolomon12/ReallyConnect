import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { recommendationsAPI, requestsAPI } from "../lib/api";
import ProfileCard from "../components/ProfileCard";
import MobileNav from "../components/MobileNav";
import "../App.css";

const AppHome = () => {
  const { userProfile } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  // Fetch recommended mentors on mount
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setLoading(true);
        const data = await recommendationsAPI.get({ limit: 20 });
        setMentors(data);
      } catch (err) {
        console.error("Error fetching mentors:", err);
        setError(err.message || "Failed to load mentors");
      } finally {
        setLoading(false);
      }
    };

    if (userProfile?.role === "mentee") {
      fetchMentors();
    }
  }, [userProfile]);

  const handleLike = async () => {
    if (currentIndex >= mentors.length) return;

    const mentor = mentors[currentIndex];
    setCreating(true);

    try {
      // Create a mentorship request
      await requestsAPI.create({
        mentor_id: mentor.user_id,
        help_type: mentor.help_types_offered[0] || "career_advice",
        context: "I would like to connect with you for mentorship.",
        key_questions: [],
      });

      // Move to next profile
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error("Error creating request:", err);
      alert(err.message || "Failed to send request. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleDislike = () => {
    // Just skip to next profile
    setCurrentIndex((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="app-home-page">
        <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading mentors...</p>
        <MobileNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-home-page">
        <div style={{ color: "red", textAlign: "center", marginTop: "2rem" }}>
          {error}
        </div>
        <MobileNav />
      </div>
    );
  }

  if (userProfile?.role !== "mentee") {
    return (
      <div className="app-home-page">
        <p style={{ textAlign: "center", marginTop: "2rem" }}>
          Mentor discovery is only available for mentees.
        </p>
        <MobileNav />
      </div>
    );
  }

  if (currentIndex >= mentors.length) {
    return (
      <div className="app-home-page">
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <h2>No more mentors to show</h2>
          <p>Check back later for more recommendations!</p>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setMentors([]);
              setLoading(true);
              recommendationsAPI.get({ limit: 20 }).then(setMentors).finally(() => setLoading(false));
            }}
            style={{ marginTop: "1rem", padding: "0.75rem 1.5rem" }}
          >
            Refresh
          </button>
        </div>
        <MobileNav />
      </div>
    );
  }

  const currentMentor = mentors[currentIndex];

  return (
    <div className="app-home-page">
      <ProfileCard
        key={currentMentor.id}
        name={currentMentor.full_name || currentMentor.job_title || "Mentor"}
        bio={[currentMentor.job_title, currentMentor.industry].filter(Boolean).join(" • ")}
        image={currentMentor.profile_picture_url}
        interests={currentMentor.interests?.map(i => i.name).join(", ")}
        helpTypes={currentMentor.help_types_offered?.join(", ")}
        className="profile-card"
      />

      <button
        className="dislike-button"
        onClick={handleDislike}
        disabled={creating}
      >
        &#10006;
      </button>

      <button
        className="like-button"
        onClick={handleLike}
        disabled={creating}
      >
        {creating ? "..." : "✔"}
      </button>

      <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.9rem" }}>
        {currentIndex + 1} of {mentors.length}
      </p>

      <MobileNav />
    </div>
  );
};

export default AppHome;
