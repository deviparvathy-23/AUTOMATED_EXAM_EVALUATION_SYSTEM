import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",        icon: "⊞", path: "/teacher"                        },
  { label: "Evaluation",       icon: "📋", path: "/evaluation"                     },
  { label: "View Results",     icon: "📊", path: "/view-mark",      active: true   },
  { label: "Reference Answer", icon: "📖", path: "/reference-answer"               },
  { label: "Revaluation",      icon: "🔄", path: "/revaluation"                    },
];

const SAMPLE_RESULTS = [
  { roll: "101", name: "Anu",   q1: 8, q2: 7, q3: 9 },
  { roll: "102", name: "Rahul", q1: 6, q2: 8, q3: 7 },
  { roll: "103", name: "Sneha", q1: 9, q2: 9, q3: 8 },
];

const ViewResults = () => {
  const [showResults, setShowResults] = useState(false);
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
          View <span>Results</span>
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

          <button
            className="com-btn view-btn"
            onClick={() => setShowResults(true)}
          >
            View Results
          </button>
        </div>

        {/* Results Table */}
        {showResults && (
          <div className="com-card results-table-card">
            <h3>Mark Matrix</h3>
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Q1</th>
                  <th>Q2</th>
                  <th>Q3</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_RESULTS.map(({ roll, name, q1, q2, q3 }) => (
                  <tr key={roll}>
                    <td>{roll}</td>
                    <td>{name}</td>
                    <td>{q1}</td>
                    <td>{q2}</td>
                    <td>{q3}</td>
                    <td style={{ color: "var(--accent)", fontWeight: 700 }}>
                      {q1 + q2 + q3}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewResults;
