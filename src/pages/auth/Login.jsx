import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const ROLES = [
  { id: "admin",   icon: "🛡️", label: "Admin"   },
  { id: "teacher", icon: "🎓", label: "Teacher" },
  { id: "student", icon: "👤", label: "Student" },
];

const ROLE_ROUTES = {
  admin:   "/admin",
  teacher: "/teacher",
  student: "/student",
};

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("student");
  const [error,    setError]    = useState("");

  // ─────────────────────────────────────────────────────────────────────────
  // Read the CURRENT data-theme attribute from <html> as initial state.
  // main.jsx already set this from localStorage before React mounted,
  // so this is always correct — no flash, no mismatch.
  // ─────────────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "dark"
  );
  const isDark = theme === "dark";

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    // 1. Update React state → re-renders the checkbox and label instantly
    setTheme(next);
    // 2. Write to <html data-theme> → CSS [data-theme] selectors fire immediately
    document.documentElement.setAttribute("data-theme", next);
    // 3. Persist with the SAME key main.jsx reads → "sage-theme"
    localStorage.setItem("sage-theme", next);
  };

  const navigate = useNavigate();

  const handleLogin = () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    navigate(ROLE_ROUTES[role]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="login-page">

      {/* ── Left Panel ── */}
      <div className="login-left">
        <div className="login-left-glow" />

        <div className="login-left-content">
          <h1 className="site-name">SAGE</h1>
          <p className="tagline">Empowering Education Digitally</p>
          <div className="login-divider" />

          <div className="login-features">
            <div className="feature-pill">
              <span className="feature-pill-icon">📋</span>
              Automated Exam Evaluation
            </div>
            <div className="feature-pill">
              <span className="feature-pill-icon">📊</span>
              Real-time Result Tracking
            </div>
            <div className="feature-pill">
              <span className="feature-pill-icon">🔄</span>
              Seamless Revaluation Workflow
            </div>
            <div className="feature-pill">
              <span className="feature-pill-icon">📖</span>
              Reference Answer Management
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="login-right">
        <div className="login-card">
          <p className="login-card-logo">SAGE</p>

          <h2>Welcome Back</h2>
          <p className="subtitle">Sign in to continue</p>

          {/* ── Role Selector ── */}
          <div className="role-selector">
            {ROLES.map(({ id, icon, label }) => (
              <button
                key={id}
                className={`role-btn ${role === id ? "selected" : ""}`}
                onClick={() => setRole(id)}
                type="button"
              >
                <span className="role-btn-icon">{icon}</span>
                <span className="role-label">{label}</span>
              </button>
            ))}
          </div>

          {/* ── Username ── */}
          <div className="form-row">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              autoComplete="username"
            />
          </div>

          {/* ── Password ── */}
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
            />
          </div>

          <button className="login-btn" onClick={handleLogin}>
            Sign In →
          </button>

          {/* ── Theme Toggle ── */}
          <div className="theme-switch-wrapper">
            <label className="theme-switch" htmlFor="theme-checkbox">
              <input
                type="checkbox"
                id="theme-checkbox"
                checked={isDark}
                onChange={toggleTheme}
              />
              <div className="slider">
                {/* Sun */}
                <svg className="sun" xmlns="http://www.w3.org/2000/svg"
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1"     x2="12" y2="3"/>
                  <line x1="12" y1="21"    x2="12" y2="23"/>
                  <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1"     y1="12"    x2="3"     y2="12"/>
                  <line x1="21"    y1="12"    x2="23"    y2="12"/>
                  <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
                  <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
                </svg>
                {/* Moon */}
                <svg className="moon" xmlns="http://www.w3.org/2000/svg"
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </div>
            </label>
            <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
          </div>

          {error && <p className="login-error">{error}</p>}
        </div>
      </div>

    </div>
  );
};

export default Login;
