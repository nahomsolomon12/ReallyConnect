import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { recommendationsAPI, requestsAPI } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import ProfileCard from "../components/ProfileCard";
import MobileNav from "../components/MobileNav";
import SendRequestModal from "../components/SendRequestModal";
import "../App.css";

const PAGE_SIZE = 20;

const AppHome = () => {
  usePageTitle("Discover");

  const { userProfile } = useAuth();
  const toast = useToast();

  const [mentors, setMentors] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [requestMentor, setRequestMentor] = useState(null);

  const fetchPage = async ({ append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const nextOffset = append ? offset : 0;
      const data = await recommendationsAPI.get({
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      setMentors((prev) => (append ? [...prev, ...data] : data));
      setOffset(nextOffset + data.length);
      if (data.length < PAGE_SIZE) setReachedEnd(true);
      else setReachedEnd(false);
      if (!append) setCurrentIndex(0);
      setError(null);
    } catch (err) {
      console.error("Error fetching mentors:", err);
      setError(err.message || "Failed to load mentors");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === "mentee") fetchPage();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.role]);

  // Prefetch next page when getting near the end.
  useEffect(() => {
    if (
      !loading &&
      !loadingMore &&
      !reachedEnd &&
      mentors.length > 0 &&
      currentIndex >= mentors.length - 3
    ) {
      fetchPage({ append: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, mentors.length, reachedEnd, loading, loadingMore]);

  const advance = () => setCurrentIndex((prev) => prev + 1);

  const openRequest = () => {
    if (currentIndex >= mentors.length) return;
    setRequestMentor(mentors[currentIndex]);
  };

  const handleSubmitRequest = async (payload) => {
    await requestsAPI.create(payload);
    toast.success("Request sent");
    setRequestMentor(null);
    advance();
  };

  const handleDislike = () => advance();

  if (userProfile && userProfile.role !== "mentee") {
    return (
      <div className="app-home-page">
        <div className="empty-state">
          <div className="empty-icon" aria-hidden>👋</div>
          <h3>You're set up as a mentor</h3>
          <p>
            Mentor discovery is built for mentees. Head over to your{" "}
            <a href="/app/matches" style={{ color: "#61d86b" }}>Requests</a> to
            triage incoming mentorship asks.
          </p>
        </div>
        <MobileNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-home-page">
        <div className="skeleton skeleton-card" aria-hidden />
        <div style={{ marginTop: "1rem", width: "100%", maxWidth: 360 }}>
          <div className="skeleton skeleton-line" style={{ width: "60%" }} />
          <div className="skeleton skeleton-line" style={{ width: "85%" }} />
        </div>
        <MobileNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-home-page">
        <div className="error-banner dark">
          <span>{error}</span>
          <button type="button" onClick={() => fetchPage()}>Retry</button>
        </div>
        <MobileNav />
      </div>
    );
  }

  if (currentIndex >= mentors.length) {
    return (
      <div className="app-home-page">
        <div className="empty-state">
          <div className="empty-icon" aria-hidden>✨</div>
          <h3>No more mentors right now</h3>
          <p>
            You've worked through the current list. Check back soon — new
            mentors join regularly.
          </p>
          <button
            className="landing-cta"
            onClick={() => {
              setOffset(0);
              setReachedEnd(false);
              fetchPage();
            }}
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
        interests={currentMentor.interests?.map((i) => i.name).join(", ")}
        helpTypes={currentMentor.help_types_offered?.join(", ")}
        className="profile-card"
      />

      <div className="swipe-actions">
        <button
          className="dislike-button"
          onClick={handleDislike}
          aria-label="Skip"
        >
          ✕
        </button>
        <button
          className="like-button"
          onClick={openRequest}
          aria-label="Send mentorship request"
        >
          ✔
        </button>
      </div>

      <p style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.85rem", opacity: 0.85 }}>
        {currentIndex + 1} of {mentors.length}{loadingMore ? " · loading more…" : ""}
      </p>

      {requestMentor && (
        <SendRequestModal
          mentor={requestMentor}
          onClose={() => setRequestMentor(null)}
          onSubmit={handleSubmitRequest}
        />
      )}

      <MobileNav />
    </div>
  );
};

export default AppHome;