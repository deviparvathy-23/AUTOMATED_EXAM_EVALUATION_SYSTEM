import React from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",        icon: "⊞", path: "/teacher",          active: true },
  { label: "Evaluation",       icon: "📋", path: "/evaluation"                     },
  { label: "View Results",     icon: "📊", path: "/view-mark"                      },
  { label: "Reference Answer", icon: "📖", path: "/reference-answer"               },
  { label: "Revaluation",      icon: "🔄", path: "/revaluation"                    },
];

const FEATURE_CARDS = [
  { label: "Evaluation",       icon: "📋", sub: "Manage & score exams",         path: "/evaluation"       },
  { label: "View Results",     icon: "📊", sub: "Browse mark matrices",         path: "/view-mark"        },
  { label: "Reference Answer", icon: "📖", sub: "Approve model answers",        path: "/reference-answer" },
  { label: "Revaluation",      icon: "🔄", sub: "Handle student requests",      path: "/revaluation"      },
];

const TeacherDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <h2 className="logo">SAGE</h2>

        <div className="user-info">
          <div className="avatar">T</div>
          <div className="user-details">
            <h4>Teacher Name</h4>
            <p>Teacher</p>
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
          Teacher <span>Dashboard</span>
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

export default TeacherDashboard;
