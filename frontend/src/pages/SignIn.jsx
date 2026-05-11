import { useState } from "react";
import Breadcrumb from "../components/BreadCrumb";
import "../App.css";
import { useAuth } from "../contexts/AuthContext";
import { usePageTitle } from "../lib/usePageTitle";

const SignIn = () => {
  usePageTitle("Sign in");
  const { signInWithEmail, signUpWithEmail, signInWithOAuth } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await signInWithEmail(email, password);
      // Auth context will handle navigation via ProtectedRoute
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      await signUpWithEmail(email, password);
      setSuccess("Account created! Please check your email to verify, then sign in.");
      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      // Switch to sign in mode
      setTimeout(() => {
        setIsSignUp(false);
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await signInWithOAuth("linkedin_oidc");
      // OAuth will redirect to LinkedIn, then back to /signup
    } catch (err) {
      setError(err.message || "Failed to sign in with LinkedIn");
      setLoading(false);
    }
  };

  return (
    <div className="sign-in-page">
      <Breadcrumb />
      <h1>{isSignUp ? "Create Account" : "Sign In"}</h1>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem", textAlign: "center" }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: "green", marginBottom: "1rem", textAlign: "center" }}>
          {success}
        </div>
      )}

      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn} style={{ marginBottom: "2rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="email" style={{ display: "block", marginBottom: "0.5rem" }}>
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "1rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="password" style={{ display: "block", marginBottom: "0.5rem" }}>
              Password {isSignUp && "(min 6 characters)"}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isSignUp ? 6 : undefined}
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "1rem",
              }}
            />
          </div>

          {isSignUp && (
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: "0.5rem" }}>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (isSignUp ? "Creating Account..." : "Signing in...") : (isSignUp ? "Create Account" : "Sign In with Email")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <p>OR</p>
        </div>

        <button
          onClick={handleLinkedInSignIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In through LinkedIn"}
        </button>

        <p style={{ marginTop: "1rem", textAlign: "center" }}>
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
              fontSize: "inherit",
            }}
          >
            {isSignUp ? "Sign in here" : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
