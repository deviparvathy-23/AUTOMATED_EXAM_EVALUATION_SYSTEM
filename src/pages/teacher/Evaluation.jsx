import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",        icon: "⊞", path: "/teacher"                         },
  { label: "Evaluation",       icon: "📋", path: "/evaluation",      active: true   },
  { label: "View Results",     icon: "📊", path: "/view-mark"                       },
  { label: "Reference Answer", icon: "📖", path: "/reference-answer"                },
  { label: "Revaluation",      icon: "🔄", path: "/revaluation"                     },
];

const Evaluation = () => {
  const [showForm, setShowForm] = useState(false);
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
          Exam <span>Evaluation</span>
        </h1>

        {/* Add Exam Toggle Button */}
        <button
          className="com-btn add-exam-btn"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "✕ Cancel" : "+ Add Exam"}
        </button>

        {/* Add Exam Form */}
        {showForm && (
          <div className="form-wrapper">
            <div className="com-card form-card">
              <h3>Add New Exam</h3>

              <select defaultValue="">
                <option value="" disabled>Select Class</option>
                <option>S1</option>
                <option>S2</option>
                <option>S3</option>
                <option>S4</option>
                <option>S5</option>
                <option>S6</option>
              </select>

              <select defaultValue="">
                <option value="" disabled>Select Course</option>
                <option>Data Structures</option>
                <option>DBMS</option>
                <option>OS</option>
              </select>

              <select defaultValue="">
                <option value="" disabled>Select Exam Type</option>
                <option>Series Test 1</option>
                <option>Series Test 2</option>
              </select>

              <button
                className="com-btn primary-btn"
                onClick={() => navigate("/upload-materials")}
              >
                Save &amp; Continue →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Evaluation;
