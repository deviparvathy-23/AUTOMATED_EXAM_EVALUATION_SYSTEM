import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",          icon: "⊞", path: "/admin"                          },
  { label: "Teacher Management", icon: "🎓", path: "/admin/teachers"                 },
  { label: "Student Management", icon: "👥", path: "/admin/students"                 },
  { label: "Add Course",         icon: "📚", path: "/admin/add-course", active: true },
  { label: "Add Class",          icon: "🏫", path: "/admin/add-class"                },
  { label: "Course Mapping",     icon: "🔗", path: "/admin/course-mapping"           },
];

const AddCourse = () => {
  const [courseId, setCourseId]     = useState("");
  const [courseName, setCourseName] = useState("");
  const [success, setSuccess]       = useState(false);
  const navigate = useNavigate();

  const handleAddCourse = () => {
    if (courseId.trim() && courseName.trim()) {
      setSuccess(true);
      setCourseId("");
      setCourseName("");
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
          Add <span>Course</span>
        </h1>

        <div className="form-wrapper">
          <div className="com-card form-card">
            <h3>Course Details</h3>

            <input
              type="text"
              placeholder="Course ID"
              value={courseId}
              onChange={(e) => { setCourseId(e.target.value); setSuccess(false); }}
            />

            <input
              type="text"
              placeholder="Course Name"
              value={courseName}
              onChange={(e) => { setCourseName(e.target.value); setSuccess(false); }}
            />

            <button className="com-btn primary-btn" onClick={handleAddCourse}>
              + Add Course
            </button>

            {success && (
              <p className="success-text">✅ Course added successfully</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddCourse;
