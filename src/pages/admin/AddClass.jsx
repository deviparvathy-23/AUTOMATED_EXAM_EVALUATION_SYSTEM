import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",          icon: "⊞", path: "/admin"                  },
  { label: "Teacher Management", icon: "🎓", path: "/admin/teachers"         },
  { label: "Student Management", icon: "👥", path: "/admin/students"         },
  { label: "Add Course",         icon: "📚", path: "/admin/add-course"       },
  { label: "Add Class",          icon: "🏫", path: "/admin/add-class", active: true },
  { label: "Course Mapping",     icon: "🔗", path: "/admin/course-mapping"   },
];

const AddClass = () => {
  const [classId, setClassId]     = useState("");
  const [className, setClassName] = useState("");
  const [success, setSuccess]     = useState(false);
  const navigate = useNavigate();

  const handleAddClass = () => {
    if (classId.trim() && className.trim()) {
      setSuccess(true);
      setClassId("");
      setClassName("");
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
          Add <span>Class</span>
        </h1>

        <div className="form-wrapper">
          <div className="com-card form-card">
            <h3>Class Details</h3>

            <input
              type="text"
              placeholder="Class ID"
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setSuccess(false); }}
            />

            <input
              type="text"
              placeholder="Class Name"
              value={className}
              onChange={(e) => { setClassName(e.target.value); setSuccess(false); }}
            />

            <button className="com-btn primary-btn" onClick={handleAddClass}>
              + Add Class
            </button>

            {success && (
              <p className="success-text">✅ Class added successfully</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddClass;
