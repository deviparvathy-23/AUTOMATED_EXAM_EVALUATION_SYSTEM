import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const INITIAL_REQUESTS = [
  { id: 1, student: "Alice", rollNo: "S2-101", class: "S2", exam: "Series Test 1", course: "Data Structures" },
  { id: 2, student: "Bob",   rollNo: "S3-204", class: "S3", exam: "Series Test 2", course: "DBMS"            },
];

const Revaluation = () => {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const navigate = useNavigate();

  const pendingCount = requests.length;

  const handleUpdateMark = (req) => {
    // Navigate to UpdateMark and pass the full request as route state
    navigate("/update-mark", { state: req });
  };

  const NAV_ITEMS = [
    { label: "Dashboard",        icon: "⊞", path: "/teacher"                      },
    { label: "Evaluation",       icon: "📋", path: "/evaluation"                   },
    { label: "View Results",     icon: "📊", path: "/view-mark"                    },
    { label: "Reference Answer", icon: "📖", path: "/reference-answer"             },
    {
      label: "Revaluation",
      icon: "🔄",
      path: "/revaluation",
      active: true,
      badge: pendingCount,
    },
  ];

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
          {NAV_ITEMS.map(({ label, icon, path, active, badge }) => (
            <li
              key={label}
              className={active ? "active" : ""}
              onClick={() => navigate(path)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
              {badge > 0 && (
                <span className="notification">{badge}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <button
            className="com-btn logout-btn-top"
            style={{ width: "100%" }}
            onClick={() => navigate("/login")}
          >
            ↩ Sign Out
          </button>
        </div>
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
          Revaluation <span>Requests</span>
        </h1>

        {requests.length === 0 ? (
          <div className="com-card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>✅</p>
            <p style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text-1)",
              marginBottom: "6px",
            }}>
              All caught up!
            </p>
            <p style={{ color: "var(--text-3)", fontSize: "14px" }}>
              No pending revaluation requests.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {requests.map(({ id, student, rollNo, class: cls, exam, course }) => (
              <div className="com-card revaluation-card" key={id}>
                <div className="revaluation-header">
                  <div>
                    <p style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "var(--text-1)",
                      marginBottom: "2px",
                    }}>
                      {student}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-3)", letterSpacing: "0.5px" }}>
                      Roll No: {rollNo}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      display: "inline-block",
                      background: "var(--accent-mid)",
                      color: "var(--accent)",
                      border: "1px solid var(--border-bright)",
                      borderRadius: "var(--r-full)",
                      padding: "4px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}>
                      {cls} · {exam}
                    </span>
                  </div>
                </div>

                <div className="revaluation-content-box">
                  <p style={{ marginBottom: "14px" }}>
                    Revaluation request for{" "}
                    <strong style={{ color: "var(--text-1)" }}>{exam}</strong>{" "}
                    in{" "}
                    <strong style={{ color: "var(--text-1)" }}>{course}</strong>,{" "}
                    class <strong style={{ color: "var(--text-1)" }}>{cls}</strong>.
                    Review the student's answer script and the reference answer
                    before marking as revalued.
                  </p>
                  <button
                    className="com-btn revalued-btn"
                    onClick={() => handleUpdateMark({ id, student, rollNo, class: cls, exam, course })}
                  >
                    ✏️ Update Mark
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Revaluation;
