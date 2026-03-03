import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",        icon: "⊞", path: "/teacher"                        },
  { label: "Evaluation",       icon: "📋", path: "/evaluation"                     },
  { label: "View Results",     icon: "📊", path: "/view-mark"                      },
  { label: "Reference Answer", icon: "📖", path: "/reference-answer", active: true },
  { label: "Revaluation",      icon: "🔄", path: "/revaluation"                    },
];

const ReferenceAnswer = () => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [approved, setApproved]     = useState(false);
  const navigate = useNavigate();

  const handleFilter = () => {
    setShowAnswer(true);
    setApproved(false);
  };

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
          Reference <span>Answer</span>
        </h1>

        {/* Filter Card */}
        <div className="com-card filter-card">
          <div className="filter-group">
            <label>Class</label>
            <select defaultValue="">
              <option value="" disabled>Select Class</option>
              <option>S1</option><option>S2</option><option>S3</option>
              <option>S4</option><option>S5</option><option>S6</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Course</label>
            <select defaultValue="">
              <option value="" disabled>Select Course</option>
              <option>Data Structures</option>
              <option>DBMS</option>
              <option>OS</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Exam</label>
            <select defaultValue="">
              <option value="" disabled>Select Exam</option>
              <option>Series Test 1</option>
              <option>Series Test 2</option>
            </select>
          </div>

          <button className="com-btn view-btn" onClick={handleFilter}>
            View Answer
          </button>
        </div>

        {/* Reference Answer Panel */}
        {showAnswer && (
          <div className="com-card reference-card">
            <div className="reference-header">
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: "17px",
                fontWeight: 700,
                color: "var(--text-1)",
              }}>
                Reference Answer
              </h3>

              {!approved ? (
                <button
                  className="com-btn approve-btn"
                  onClick={() => setApproved(true)}
                >
                  ✓ Approve
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="approved-badge">✓ Approved</span>
                  <button className="com-btn view-btn">View</button>
                </div>
              )}
            </div>

            <div className="reference-content-box">
              <p>
                The reference answer for the selected exam will appear here. Review
                the model answer carefully before approving it for student
                revaluation requests.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReferenceAnswer;
