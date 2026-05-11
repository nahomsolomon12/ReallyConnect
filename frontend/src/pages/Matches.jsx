import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { requestsAPI } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import MobileNav from "../components/MobileNav";
import "../App.css";

const Matches = () => {
  usePageTitle("Matches");
  const { userProfile } = useAuth();
  const toast = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [confirmDecline, setConfirmDecline] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestsAPI.getAll();
      setRequests(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const { acceptedRequests, pendingRequests, sentPending } = useMemo(() => {
    const accepted = requests.filter((r) => r.status === "accepted");
    const pending = requests.filter((r) => r.status === "pending");
    // For mentees, "pending" is "sent but not yet answered"
    return {
      acceptedRequests: accepted,
      pendingRequests: pending,
      sentPending: pending,
    };
  }, [requests]);

  const handleAccept = async (requestId) => {
    setAccepting(requestId);
    try {
      await requestsAPI.accept(requestId);
      toast.success("Request accepted");
      await fetchRequests();
    } catch (err) {
      console.error("Error accepting request:", err);
      toast.error(err.message || "Failed to accept request");
    } finally {
      setAccepting(null);
    }
  };

  const handleDecline = async (requestId) => {
    setDeclining(requestId);
    try {
      await requestsAPI.decline(requestId);
      toast.info("Request declined");
      setConfirmDecline(null);
      await fetchRequests();
    } catch (err) {
      console.error("Error declining request:", err);
      toast.error(err.message || "Failed to decline request");
    } finally {
      setDeclining(null);
    }
  };

  const heading =
    userProfile?.role === "mentor" ? "Your Requests" : "Your Matches";

  if (loading) {
    return (
      <div className="matches-page">
        <h1>{heading}</h1>
        <div className="match-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="match-item">
              <div className="skeleton" style={{ width: 50, height: 50, borderRadius: "50%" }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-line" style={{ width: "55%" }} />
                <div className="skeleton skeleton-line" style={{ width: "35%" }} />
              </div>
            </div>
          ))}
        </div>
        <MobileNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="matches-page">
        <h1>{heading}</h1>
        <div className="error-banner dark">
          <span>{error}</span>
          <button type="button" onClick={fetchRequests}>Retry</button>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="matches-page">
      <h1>{heading}</h1>

      {userProfile?.role === "mentor" && (
        <>
          <h2 style={{ marginTop: "1.5rem", fontSize: "1.1rem" }}>
            Pending Requests{pendingRequests.length > 0 && ` (${pendingRequests.length})`}
          </h2>

          {pendingRequests.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <p>No pending requests right now. New asks will show up here.</p>
            </div>
          ) : (
            <div className="match-list">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="match-item"
                  style={{ flexDirection: "column", alignItems: "stretch" }}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>{request.mentee_name || "Mentee"}</h4>
                    <p style={{ margin: "0.25rem 0" }}>
                      <strong>Help type:</strong>{" "}
                      <span style={{
                        background: "#e8f5e9",
                        color: "#2e7d32",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 999,
                        fontSize: "0.85rem",
                      }}>
                        {request.help_type.replace(/_/g, " ")}
                      </span>
                    </p>
                    <p style={{ margin: "0.25rem 0" }}>
                      <strong>Context:</strong> {request.context}
                    </p>
                    {Array.isArray(request.key_questions) && request.key_questions.length > 0 && (
                      <ul style={{ paddingLeft: "1.25rem", margin: "0.25rem 0" }}>
                        {request.key_questions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    )}
                    <p style={{ fontSize: "0.8rem", color: "#666", margin: 0 }}>
                      Received: {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                    <button
                      className="update-btn"
                      onClick={() => handleAccept(request.id)}
                      disabled={accepting === request.id || declining === request.id}
                      style={{ margin: 0 }}
                    >
                      {accepting === request.id ? "Accepting..." : "Accept"}
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => setConfirmDecline(request.id)}
                      disabled={accepting === request.id || declining === request.id}
                      style={{ margin: 0 }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {userProfile?.role === "mentee" && sentPending.length > 0 && (
        <>
          <h2 style={{ marginTop: "1.5rem", fontSize: "1.1rem" }}>
            Pending Sent
          </h2>
          <div className="match-list">
            {sentPending.map((request) => (
              <div key={request.id} className="match-item">
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  background: "#ddd",
                }} />
                <div>
                  <h4 style={{ margin: 0 }}>Awaiting mentor response</h4>
                  <p style={{ margin: "0.2rem 0", fontSize: "0.85rem" }}>
                    {request.help_type.replace(/_/g, " ")}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#666", margin: 0 }}>
                    Sent: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ marginTop: "1.5rem", fontSize: "1.1rem" }}>
        {userProfile?.role === "mentor" ? "Accepted Connections" : "Your Matches"}
      </h2>

      {acceptedRequests.length === 0 ? (
        <div className="empty-state" style={{ padding: "1.5rem 0" }}>
          <div className="empty-icon" aria-hidden>💬</div>
          <p>
            {userProfile?.role === "mentee"
              ? "No matches yet. Keep swiping to send more requests!"
              : "No accepted connections yet. Accept a request to start chatting."}
          </p>
        </div>
      ) : (
        <div className="match-list">
          {acceptedRequests.map((request) => {
            const partnerId =
              userProfile?.role === "mentor" ? request.mentee_id : request.mentor_id;
            const displayName =
              userProfile?.role === "mentor"
                ? request.mentee_name || "Mentee"
                : request.mentor_name || "Mentor";
            return (
              <a
                key={request.id}
                className="match-message"
                href={`/app/matches/messages/${partnerId}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="match-item">
                  <div
                    aria-hidden
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: "#4caf50",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ margin: 0 }}>{displayName}</h4>
                    <p style={{ margin: "0.2rem 0" }}>Tap to message</p>
                    <p style={{ fontSize: "0.8rem", color: "#666", margin: 0 }}>
                      {request.help_type.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {confirmDecline && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget && !declining) setConfirmDecline(null);
        }}>
          <div className="modal">
            <h2>Decline this request?</h2>
            <p>This will let the mentee know you can't help right now.</p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                disabled={!!declining}
                onClick={() => setConfirmDecline(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: "#c62828" }}
                disabled={!!declining}
                onClick={() => handleDecline(confirmDecline)}
              >
                {declining ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav matchesBadge={userProfile?.role === "mentor" ? pendingRequests.length : 0} />
    </div>
  );
};

export default Matches;