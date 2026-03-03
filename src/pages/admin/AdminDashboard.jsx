import React from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",          icon: "⊞", path: "/admin",                active: true  },
];

const FEATURE_CARDS = [
  { label: "Teacher Management", icon: "🎓", sub: "Manage faculty records",   path: "/admin/teachers"         },
  { label: "Student Management", icon: "👥", sub: "Enrol & update students",  path: "/admin/students"         },
  { label: "Add Course",         icon: "📚", sub: "Create new courses",       path: "/admin/add-course"       },
  { label: "Add Class",          icon: "🏫", sub: "Define class sections",    path: "/admin/add-class"        },
  { label: "Course Mapping",     icon: "🔗", sub: "Assign courses to classes", path: "/admin/course-mapping"  },
];

const AdminDashboard = () => {
  const admin = { name: "Admin1", role: "System Administrator" };
  const navigate = useNavigate();

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
          Admin <span>Dashboard</span>
        </h1>

        <div className="card-grid">
          {FEATURE_CARDS.map(({ label, icon, sub, path }) => (
            <div
              key={label}
              className="dash-card"
              onClick={() => navigate(path)}
            >
              <div className="card-icon">{icon}</div>
              <h3>{label}</h3>
              <p className="card-sub">{sub}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
