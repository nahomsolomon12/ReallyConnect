import { NavLink } from "react-router-dom";
import { FaHome, FaUser, FaComments } from "react-icons/fa";

import "../App.css";

const MobileNav = ({ matchesBadge = 0 }) => {
  return (
    <nav className="mobile-nav">
      <NavLink to="/app/matches" className="nav-item">
        <FaComments />
        <span>Matches</span>
        {matchesBadge > 0 && (
          <span className="nav-badge" aria-label={`${matchesBadge} new`}>
            {matchesBadge > 99 ? "99+" : matchesBadge}
          </span>
        )}
      </NavLink>
      <NavLink to="/app/home" className="nav-item">
        <FaHome />
        <span>Home</span>
      </NavLink>
      <NavLink to="/app/profile" className="nav-item">
        <FaUser />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
};

export default MobileNav;
