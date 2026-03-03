import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",       icon: "⊞", path: "/student"                          },
  { label: "View Answer Key", icon: "📖", path: "/student/answer-key", active: true },
  { label: "View Result",     icon: "📊", path: "/student/result"                   },
];

const ViewAnswerKey = () => {
  const navigate = useNavigate();
  const [course, setCourse] = useState("");
  const [exam,   setExam]   = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  const handleView = () => {
    if (!course || !exam) {
      alert("Please select both a course and an exam.");
      return;
    }
    setShowAnswer(true);
  };

  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    setShowAnswer(false);
  };

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
          View <span>Answer Key</span>
        </h1>

        {/* Filter Card */}
        <div className="com-card filter-card">
          <div className="filter-group">
            <label>Course</label>
            <select value={course} onChange={handleChange(setCourse)} defaultValue="">
              <option value="" disabled>Select Course</option>
              <option>Data Structures</option>
              <option>DBMS</option>
              <option>OS</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Exam</label>
            <select value={exam} onChange={handleChange(setExam)} defaultValue="">
              <option value="" disabled>Select Exam</option>
              <option>Series Test 1</option>
              <option>Series Test 2</option>
            </select>
          </div>

          <button className="com-btn view-btn" onClick={handleView}>
            View Answer Key
          </button>
        </div>

        {/* Answer Key Panel */}
        {showAnswer && (
          <div className="com-card reference-card">
            <div className="reference-header">
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: "17px",
                fontWeight: 700,
                color: "var(--text-1)",
              }}>
                {exam} — {course}
              </h3>
              <span className="approved-badge">✓ Approved</span>
            </div>
            <div className="reference-content-box">
              <p>
                The approved reference answer for{" "}
                <strong style={{ color: "var(--text-1)" }}>{exam}</strong> in{" "}
                <strong style={{ color: "var(--text-1)" }}>{course}</strong> will
                appear here once published by your teacher.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewAnswerKey;
