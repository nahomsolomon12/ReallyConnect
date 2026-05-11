import { Link } from "react-router-dom";
import Nav from "../components/Nav";
import { usePageTitle } from "../lib/usePageTitle";

const Landing = () => {
  usePageTitle("Mentorship that respects everyone's time");

  return (
    <div className="app-shell">
      <Nav />

      <section className="landing-hero">
        <h1>Mentorship that respects everyone's time.</h1>
        <p className="subhead">
          ReallyConnect helps students and early-career professionals reach
          alumni and industry mentors with structured, intentional requests —
          not cold DMs.
        </p>
        <Link to="/signin" className="landing-cta">
          Get started
        </Link>
      </section>

      <section className="landing-steps" aria-label="How it works">
        <div className="landing-step">
          <span className="step-num">1</span>
          <h3>Browse</h3>
          <p>
            Swipe through mentors filtered by industry, help type, and shared
            interests.
          </p>
        </div>
        <div className="landing-step">
          <span className="step-num">2</span>
          <h3>Request</h3>
          <p>
            Send a clear, AI-assisted request with context and specific
            questions so mentors can help in minutes, not hours.
          </p>
        </div>
        <div className="landing-step">
          <span className="step-num">3</span>
          <h3>Connect</h3>
          <p>
            Once accepted, chat directly inside the app and build the
            relationship from there.
          </p>
        </div>
      </section>

      <p className="landing-purpose">
        Built with communities like <strong>ColorStack</strong> in mind, where
        meaningful mentor responses can change a career trajectory.
      </p>

      <footer>© ReallyConnect 2026</footer>
    </div>
  );
};

export default Landing;