import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { requestsAPI } from "../lib/api";
import MobileNav from "../components/MobileNav";
import "../App.css";

const Matches = () => {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const data = await requestsAPI.getAll();
        setRequests(data);
      } catch (err) {
        console.error("Error fetching requests:", err);
        setError(err.message || "Failed to load requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleAccept = async (requestId) => {
    setAccepting(requestId);
    try {
      await requestsAPI.accept(requestId);
      // Refresh the list
      const data = await requestsAPI.getAll();
      setRequests(data);
    } catch (err) {
      console.error("Error accepting request:", err);
      alert(err.message || "Failed to accept request");
    } finally {
      setAccepting(null);
    }
  };

  const handleDecline = async (requestId) => {
    if (!confirm("Are you sure you want to decline this request?")) return;

    try {
      await requestsAPI.decline(requestId);
      // Refresh the list
      const data = await requestsAPI.getAll();
      setRequests(data);
    } catch (err) {
      console.error("Error declining request:", err);
      alert(err.message || "Failed to decline request");
    }
  };

  if (loading) {
    return (
      <div className="matches-page">
        <h1>Your {userProfile?.role === "mentor" ? "Requests" : "Matches"}</h1>
        <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>
        <MobileNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="matches-page">
        <h1>Your {userProfile?.role === "mentor" ? "Requests" : "Matches"}</h1>
        <div style={{ color: "red", textAlign: "center", marginTop: "2rem" }}>
          {error}
        </div>
        <MobileNav />
      </div>
    );
  }

  const acceptedRequests = requests.filter((r) => r.status === "accepted");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="matches-page">
      <h1>Your {userProfile?.role === "mentor" ? "Requests" : "Matches"}</h1>

      {userProfile?.role === "mentor" && pendingRequests.length > 0 && (
        <>
          <h2 style={{ marginTop: "2rem", fontSize: "1.2rem" }}>Pending Requests</h2>
          <div className="match-list">
            {pendingRequests.map((request) => (
              <div key={request.id} className="match-item" style={{
                border: "1px solid #ccc",
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: "8px"
              }}>
                <div>
                  <h4>{request.mentee_name || "Mentee"}</h4>
                  <p><strong>Help Type:</strong> {request.help_type.replace('_', ' ')}</p>
                  <p><strong>Context:</strong> {request.context}</p>
                  <p style={{ fontSize: "0.8rem", color: "#666" }}>
                    Received: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
                  <button
                    onClick={() => handleAccept(request.id)}
                    disabled={accepting === request.id}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: accepting === request.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {accepting === request.id ? "Accepting..." : "Accept"}
                  </button>
                  <button
                    onClick={() => handleDecline(request.id)}
                    disabled={accepting === request.id}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: accepting === request.id ? "not-allowed" : "pointer",
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ marginTop: "2rem", fontSize: "1.2rem" }}>
        {userProfile?.role === "mentor" ? "Accepted Connections" : "Your Matches"}
      </h2>

      {acceptedRequests.length === 0 ? (
        <p style={{ textAlign: "center", marginTop: "1rem", color: "#666" }}>
          No matches yet. {userProfile?.role === "mentee" ? "Keep swiping!" : "Wait for requests to come in."}
        </p>
      ) : (
        <div className="match-list">
          {acceptedRequests.map((request) => {
            const partnerId =
              userProfile?.role === "mentor" ? request.mentee_id : request.mentor_id;
            return (
              <a
                key={request.id}
                className="match-message"
                href={`/app/matches/messages/${partnerId}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="match-item">
                  <div style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "#ddd" }} />
                  <div>
                    <h4>
                      {userProfile?.role === "mentor"
                        ? request.mentee_name || "Mentee"
                        : request.mentor_name || "Mentor"}
                    </h4>
                    <p>Tap to message</p>
                    <p style={{ fontSize: "0.8rem", color: "#666" }}>
                      {request.help_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <MobileNav />
    </div>
  );
};

export default Matches;
