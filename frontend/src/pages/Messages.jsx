import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { messagesAPI } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import MobileNav from "../components/MobileNav";
import "../App.css";

const POLL_INTERVAL_MS = 5000;

const Messages = () => {
  const navigation = useNavigate();
  const { userId } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);
  const pollTimerRef = useRef(null);

  const loadThread = async ({ silent = false } = {}) => {
    if (!userId) return;
    try {
      if (!silent) setLoading(true);
      const thread = await messagesAPI.list(userId);
      setPartner(thread.partner);
      setMessages(thread.messages || []);
      setError(null);
    } catch (err) {
      console.error("Error loading messages:", err);
      setError(err.message || "Failed to load messages");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadThread();

    pollTimerRef.current = setInterval(() => {
      loadThread({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);
    try {
      const newMessage = await messagesAPI.send(userId, content);
      setMessages((prev) => [...prev, newMessage]);
      setDraft("");
    } catch (err) {
      console.error("Error sending message:", err);
      const msg = err.message || "Failed to send message";
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const partnerName = partner?.full_name || "Conversation";
  usePageTitle(partner?.full_name ? `Chat · ${partner.full_name}` : "Chat");

  return (
    <div className="matches-page">
      <div className="messages-header">
        <p
          className="messages-back"
          onClick={() => navigation("/app/matches")}
          style={{ cursor: "pointer", color: "#fff" }}
        >
          &larr; Back
        </p>
        <h2 style={{ color: "#fff", margin: 0 }}>{partnerName}</h2>
      </div>

      <div
        ref={scrollRef}
        style={{
          marginTop: "1rem",
          marginBottom: "8rem",
          minHeight: "50vh",
          maxHeight: "60vh",
          overflowY: "auto",
          padding: "0 1rem",
          color: "#fff",
        }}
      >
        {loading && (
          <p style={{ textAlign: "center", color: "#ccc", fontSize: "0.9rem" }}>
            Loading messages...
          </p>
        )}

        {error && !loading && (
          <p style={{ textAlign: "center", color: "#ff8a8a", fontSize: "0.9rem" }}>
            {error}
          </p>
        )}

        {!loading && !error && messages.length === 0 && (
          <p style={{ textAlign: "center", color: "#ccc", fontSize: "0.9rem" }}>
            No messages yet. Start the conversation!
          </p>
        )}

        {!loading &&
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  margin: "0.4rem 0",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "16px",
                    backgroundColor: mine ? "#4caf50" : "#2c2c2c",
                    color: "#fff",
                    fontSize: "0.95rem",
                    wordBreak: "break-word",
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
      </div>

      <form onSubmit={handleSend} className="message-textbox-container">
        <input
          type="text"
          placeholder="Send a message..."
          className="message-textbox"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending || loading}
        />
        <button
          type="submit"
          className="message-send-button"
          disabled={sending || loading || !draft.trim()}
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
      <MobileNav />
    </div>
  );
};

export default Messages;