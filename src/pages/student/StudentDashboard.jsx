import React from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",      icon: "⊞", path: "/student",            active: true },
];

const FEATURE_CARDS = [
  { label: "View Result",     icon: "📊", sub: "Check your exam scores",       path: "/student/result"     },
  { label: "View Answer Key", icon: "📖", sub: "Browse approved model answers", path: "/student/answer-key" },
];

const StudentDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <h2 className="logo">SAGE</h2>

        <div className="user-info">
          <div className="avatar">S</div>
          <div className="user-details">
            <h4>Ammu</h4>
            <p>Student</p>
          </div>
        </div>

        <ul className="sidebar-cards">
          {NAV_ITEMS.map(({ label, icon, path, active }) => (
            <li
              key={label}
              className={active ? "active" : ""}
              onClick={() => navigate(path)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </li>
          ))}
        </ul>

      </aside>

      {/* ── Main ── */}
      <main className="main">
        <div className="logout-container">
          <button
            className="com-btn logout-btn-top"
            onClick={() => navigate("/login")}
          >
            ↩ Logout
          </button>
        </div>

        <h1 className="page-title">
          Student <span>Dashboard</span>
        </h1>

        <div className="card-grid">
          {FEATURE_CARDS.map(({ label, icon, sub, path }) => (
            <div
              key={label}
              className="dash-card"
              onClick={() => navigate(path)}
            >
              <div className="card-icon">{icon}</div>
              <h3>{label}</h3>
              <p className="card-sub">{sub}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
