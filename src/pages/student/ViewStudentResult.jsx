import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",       icon: "⊞", path: "/student"                       },
  { label: "View Answer Key", icon: "📖", path: "/student/answer-key"            },
  { label: "View Result",     icon: "📊", path: "/student/result", active: true  },
];

// Sample result data — replace with real API data
const SAMPLE_RESULT = {
  student: "Ammu",
  rollNo: "S3-112",
  course: "Data Structures",
  exam: "Series Test 1",
  scores: [
    { question: "Q1", marks: 8, max: 10 },
    { question: "Q2", marks: 7, max: 10 },
    { question: "Q3", marks: 9, max: 10 },
  ],
};

const ViewResult = () => {
  const navigate  = useNavigate();
  const [course,      setCourse]      = useState("");
  const [exam,        setExam]        = useState("");
  const [showResult,  setShowResult]  = useState(false);

  const handleView = () => {
    if (!course || !exam) {
      alert("Please select both a course and an exam.");
      return;
    }
    setShowResult(true);
  };

  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    setShowResult(false);
  };

  const total    = SAMPLE_RESULT.scores.reduce((s, r) => s + r.marks, 0);
  const maxTotal = SAMPLE_RESULT.scores.reduce((s, r) => s + r.max,   0);
  const pct      = Math.round((total / maxTotal) * 100);

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
          View <span>Result</span>
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
            View Result
          </button>
        </div>

        {/* Result Panel */}
        {showResult && (
          <div className="com-card results-table-card">
            {/* Score summary header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}>
              <div>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: "var(--text-1)",
                  marginBottom: "4px",
                }}>
                  {exam} — {course}
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-3)" }}>
                  Roll No: {SAMPLE_RESULT.rollNo}
                </p>
              </div>

              {/* Total score pill */}
              <div style={{
                textAlign: "center",
                background: "var(--accent-mid)",
                border: "1px solid var(--border-bright)",
                borderRadius: "var(--r-lg)",
                padding: "12px 24px",
              }}>
                <p style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "var(--accent)",
                  lineHeight: 1,
                }}>
                  {total}/{maxTotal}
                </p>
                <p style={{ fontSize: "16px", color: "var(--text-3)", marginTop: "4px" }}>
                  {pct}%
                </p>
              </div>
            </div>

            {/* Marks breakdown table */}
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Marks Obtained</th>
                  <th>Maximum Marks</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_RESULT.scores.map(({ question, marks, max }) => (
                  <tr key={question}>
                    <td>{question}</td>
                    <td style={{ color: "var(--accent)", fontWeight: 700 }}>{marks}</td>
                    <td style={{ color: "var(--text-3)" }}>{max}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid var(--border-bright)" }}>
                  <td style={{ fontWeight: 700, color: "var(--text-1)" }}>Total</td>
                  <td style={{ fontWeight: 800, color: "var(--primary)" }}>{total}</td>
                  <td style={{ color: "var(--text-3)" }}>{maxTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewResult;
