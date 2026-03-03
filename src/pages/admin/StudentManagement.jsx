import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",          icon: "⊞", path: "/admin"                          },
  { label: "Teacher Management", icon: "🎓", path: "/admin/teachers"                 },
  { label: "Student Management", icon: "👥", path: "/admin/students",   active: true },
  { label: "Add Course",         icon: "📚", path: "/admin/add-course"               },
  { label: "Add Class",          icon: "🏫", path: "/admin/add-class"                },
  { label: "Course Mapping",     icon: "🔗", path: "/admin/course-mapping"           },
];

const ACTION_CARDS = [
  {
    id: "add",
    icon: "➕",
    label: "Add Student",
    sub: "Enrol a new student",
  },
  {
    id: "update",
    icon: "✏️",
    label: "Update Student",
    sub: "Edit existing student details",
  },
  {
    id: "delete",
    icon: "🗑️",
    label: "Delete Student",
    sub: "Remove a student from the system",
    danger: true,
  },
];

const StudentManagement = () => {
  const admin = { name: "Admin1", role: "System Administrator" };
  const [activeAction, setActiveAction] = useState(null);
  const [selectedField, setSelectedField] = useState("");
  const navigate = useNavigate();

  const toggleAction = (id) => {
    setActiveAction((prev) => (prev === id ? null : id));
    setSelectedField("");
  };

  return (
    <div className="container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <h2 className="logo">SAGE</h2>

        <div className="user-info">
          <div className="avatar">{admin.name.charAt(0)}</div>
          <div className="user-details">
            <h4>{admin.name}</h4>
            <p>{admin.role}</p>
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
          Student <span>Management</span>
        </h1>

        <div className="card-grid">
          {ACTION_CARDS.map(({ id, icon, label, sub, danger }) => (
            <div key={id} className="dash-card-wrapper">
              {/* Toggle card */}
              <div
                className={`dash-card ${danger ? "danger-card" : ""} ${activeAction === id ? "active" : ""}`}
                onClick={() => toggleAction(id)}
              >
                <div className="card-icon">{icon}</div>
                <h3>{label}</h3>
                <p className="card-sub" style={{ color: danger ? "var(--danger)" : undefined }}>
                  {sub}
                </p>
              </div>

              {/* ── Add Form ── */}
              {activeAction === "add" && id === "add" && (
                <div className="com-card form-card">
                  <h3>Add Student</h3>
                  <input placeholder="Roll No" />
                  <input placeholder="Admission No" />
                  <input placeholder="Full Name" />
                  <input placeholder="Class" />
                  <input placeholder="Email Address" type="email" />
                  <button className="com-btn primary-btn">+ Add Student</button>
                </div>
              )}

              {/* ── Update Form ── */}
              {activeAction === "update" && id === "update" && (
                <div className="com-card form-card">
                  <h3>Update Student</h3>
                  <input placeholder="Enter Student ID" />
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                  >
                    <option value="">Select Field to Update</option>
                    <option value="name">Name</option>
                    <option value="class">Class</option>
                    <option value="email">Email</option>
                  </select>
                  {selectedField && (
                    <input placeholder={`New ${selectedField}`} />
                  )}
                  <button className="com-btn primary-btn">Save Changes</button>
                </div>
              )}

              {/* ── Delete Form ── */}
              {activeAction === "delete" && id === "delete" && (
                <div className="com-card form-card danger">
                  <h3 style={{ color: "var(--danger)" }}>Delete Student</h3>
                  <input placeholder="Enter Student ID" />
                  <p className="warning-text">
                    ⚠️ This action is permanent and cannot be undone.
                  </p>
                  <button className="com-btn danger-btn">Confirm Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StudentManagement;
