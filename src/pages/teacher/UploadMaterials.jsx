import React from "react";
import { useNavigate } from "react-router-dom";
import "../admin/AdminDashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard",        icon: "⊞", path: "/teacher"                        },
  { label: "Evaluation",       icon: "📋", path: "/evaluation",     active: true   },
  { label: "View Results",     icon: "📊", path: "/view-mark"                      },
  { label: "Reference Answer", icon: "📖", path: "/reference-answer"               },
  { label: "Revaluation",      icon: "🔄", path: "/revaluation"                    },
];

const UPLOAD_TILES = [
  {
    icon: "📄",
    label: "Question Paper",
    hint: "PDF only",
    accept: ".pdf",
    multiple: false,
    dir: false,
  },
  {
    icon: "📝",
    label: "Marking Scheme",
    hint: "PDF only",
    accept: ".pdf",
    multiple: false,
    dir: false,
  },
  {
    icon: "📂",
    label: "Answer Scripts",
    hint: "Upload folder",
    accept: "",
    multiple: true,
    dir: true,
  },
];

const UploadMaterials = () => {
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
          Series Test 1 — S3 — <span>Data Structures</span>
        </h1>

        <div className="com-card upload-card">
          <h3>Upload Evaluation Materials</h3>

          <div className="upload-grid option1">
            {UPLOAD_TILES.map(({ icon, label, hint, accept, multiple, dir }) => (
              <label className="upload-tile" key={label}>
                <span className="icon">{icon}</span>
                <p>{label}</p>
                <small>{hint}</small>
                <input
                  type="file"
                  accept={accept || undefined}
                  multiple={multiple || undefined}
                  {...(dir ? { webkitdirectory: "true", directory: "" } : {})}
                />
              </label>
            ))}
          </div>

          <button
            className="com-btn evaluate-btn"
            onClick={() => navigate("/evaluation")}
          >
            ⚡ Evaluate Answers
          </button>
        </div>
      </main>
    </div>
  );
};

export default UploadMaterials;
