import { useEffect, useMemo, useState } from "react";

const HELP_TYPE_LABELS = {
  resume_review: "Resume Review",
  mock_interview: "Mock Interview",
  career_advice: "Career Advice",
  social_advice: "Social Advice",
};

const MAX_CONTEXT = 1000;
const MAX_QUESTION = 200;
const MAX_QUESTIONS = 5;

const SendRequestModal = ({ mentor, onClose, onSubmit }) => {
  const offered = useMemo(
    () => mentor?.help_types_offered || [],
    [mentor]
  );

  const [helpType, setHelpType] = useState(offered[0] || "career_advice");
  const [context, setContext] = useState("");
  const [questions, setQuestions] = useState([""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setHelpType(offered[0] || "career_advice");
  }, [offered]);

  const trimmedContext = context.trim();
  const validQuestions = questions.map((q) => q.trim()).filter(Boolean);
  const canSubmit =
    !submitting &&
    trimmedContext.length >= 20 &&
    trimmedContext.length <= MAX_CONTEXT;

  const handleQuestionChange = (idx, value) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? value : q)));
  };

  const addQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) return;
    setQuestions((prev) => [...prev, ""]);
  };

  const removeQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        mentor_id: mentor.user_id,
        help_type: helpType,
        context: trimmedContext,
        key_questions: validQuestions.length > 0 ? validQuestions : null,
      });
    } catch (err) {
      setError(err.message || "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <form className="modal" onSubmit={handleSubmit}>
        <h2>Request mentorship from {mentor?.full_name || mentor?.job_title || "this mentor"}</h2>

        {error && <div className="error-banner">{error}</div>}

        <label htmlFor="help_type">What kind of help?</label>
        <select
          id="help_type"
          value={helpType}
          onChange={(e) => setHelpType(e.target.value)}
        >
          {(offered.length ? offered : Object.keys(HELP_TYPE_LABELS)).map((ht) => (
            <option key={ht} value={ht}>
              {HELP_TYPE_LABELS[ht] || ht}
            </option>
          ))}
        </select>

        <label htmlFor="context">
          Context (at least 20 characters)
        </label>
        <textarea
          id="context"
          value={context}
          maxLength={MAX_CONTEXT}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Tell them a bit about who you are and what you're hoping to learn or get help with."
          required
        />
        <div className="char-count">
          {trimmedContext.length} / {MAX_CONTEXT}
        </div>

        <label>Key questions (optional, up to {MAX_QUESTIONS})</label>
        <div className="key-questions-list">
          {questions.map((q, idx) => (
            <div key={idx} className="key-question-row">
              <input
                type="text"
                value={q}
                maxLength={MAX_QUESTION}
                placeholder={`Question ${idx + 1}`}
                onChange={(e) => handleQuestionChange(idx, e.target.value)}
              />
              {questions.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove question"
                  onClick={() => removeQuestion(idx)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {questions.length < MAX_QUESTIONS && (
            <button type="button" className="add-question-btn" onClick={addQuestion}>
              + Add another question
            </button>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {submitting ? "Sending..." : "Send request"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendRequestModal;