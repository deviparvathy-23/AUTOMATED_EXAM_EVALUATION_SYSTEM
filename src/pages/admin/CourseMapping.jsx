import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",          icon: "⊞", path: "/admin"                              },
  { label: "Teacher Management", icon: "🎓", path: "/admin/teachers"                     },
  { label: "Student Management", icon: "👥", path: "/admin/students"                     },
  { label: "Add Course",         icon: "📚", path: "/admin/add-course"                   },
  { label: "Add Class",          icon: "🏫", path: "/admin/add-class"                    },
  { label: "Course Mapping",     icon: "🔗", path: "/admin/course-mapping", active: true },
];

const classes  = ["Class 1", "Class 2", "Class 3"];
const courses  = ["Math", "Science", "History"];
const teachers = ["Dr. John Mathew", "Ms. Sarah Lee", "Mr. Alex Kim"];

const CourseMapping = () => {
  const [selectedClass,   setSelectedClass]   = useState("");
  const [selectedCourse,  setSelectedCourse]  = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleMapCourse = () => {
    if (selectedClass && selectedCourse && selectedTeacher) {
      setSuccess(true);
      setSelectedClass("");
      setSelectedCourse("");
      setSelectedTeacher("");
    } else {
      alert("Please fill all fields ❌");
    }
  };

  return (
    <div className="container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <h2 className="logo">SAGE</h2>

        <div className="user-info">
          <div className="avatar">A</div>
          <div className="user-details">
            <h4>Admin1</h4>
            <p>System Administrator</p>
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
          Course <span>Mapping</span>
        </h1>

        <div className="form-wrapper">
          <div className="com-card form-card">
            <h3>Map Course to Class &amp; Teacher</h3>

            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSuccess(false); }}
            >
              <option value="">Select Class</option>
              {classes.map((cls, i) => (
                <option key={i} value={cls}>{cls}</option>
              ))}
            </select>

            <select
              value={selectedCourse}
              onChange={(e) => { setSelectedCourse(e.target.value); setSuccess(false); }}
            >
              <option value="">Select Course</option>
              {courses.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedTeacher}
              onChange={(e) => { setSelectedTeacher(e.target.value); setSuccess(false); }}
            >
              <option value="">Select Teacher</option>
              {teachers.map((t, i) => (
                <option key={i} value={t}>{t}</option>
              ))}
            </select>

            <button className="com-btn primary-btn" onClick={handleMapCourse}>
              🔗 Map Course
            </button>

            {success && (
              <p className="success-text">✅ Course mapped successfully!</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseMapping;
