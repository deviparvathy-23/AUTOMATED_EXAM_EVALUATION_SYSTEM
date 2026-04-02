import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../admin/AdminDashboard.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const BATCH_SIZE    = 10;
const POLL_INTERVAL = 10_000; // 10 seconds

const NAV_ITEMS = [
  { label: "Dashboard",        icon: "⊞", path: "/teacher" },
  { label: "Evaluation",       icon: "📋", path: "/evaluation", active: true },
  { label: "View Results",     icon: "📊", path: "/view-mark" },
  { label: "Reference Answer", icon: "📖", path: "/reference-answer" },
  { label: "Revaluation",      icon: "🔄", path: "/revaluation" },
  { label: "My Classes",       icon: "🏫", path: "/courseclass" },
];

/* ─── Status phases ───────────────────────────────────────────────────────
   idle → uploading → queued → evaluating → done | error
────────────────────────────────────────────────────────────────────────── */

const PHASE_META = {
  uploading:  { label: "Uploading scripts…",          sub: "Sending files to server in batches" },
  queued:     { label: "Scripts queued for OCR…",     sub: "Extraction will begin shortly" },
  evaluating: { label: "Evaluating answer scripts…",  sub: "SAGE is grading — this may take a few minutes" },
  done:       { label: "Evaluation complete!",         sub: "" },
  error:      { label: "Something went wrong",         sub: "" },
};

/* ── Modal ── */
const StatusModal = ({ phase, batchProgress, evalProgress, errorMsg }) => {
  const meta = PHASE_META[phase] || {};
  const isDone  = phase === "done";
  const isError = phase === "error";

  return (
    <div className="eval-overlay">
      <div className="eval-modal">
        {!isDone && !isError && (
          <div className="eval-spinner">
            <div className="eval-ring" />
            <div className="eval-ring eval-ring--2" />
            <div className="eval-ring eval-ring--3" />
            <span className="eval-icon">📋</span>
          </div>
        )}
        {isDone  && <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>}
        {isError && <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>}

        <h3 className="eval-title">{meta.label}</h3>
        {meta.sub && <p className="eval-subtitle">{meta.sub}</p>}

        {/* Upload batch progress */}
        {phase === "uploading" && batchProgress && (
          <p className="eval-subtitle" style={{ fontWeight: 500 }}>
            Batch {batchProgress.current} of {batchProgress.total}
          </p>
        )}

        {/* Eval progress */}
        {(phase === "evaluating" || phase === "queued") && evalProgress && (
          <p className="eval-subtitle" style={{ fontWeight: 500 }}>
            {evalProgress.done} / {evalProgress.total} scripts processed
          </p>
        )}

        {isError && errorMsg && (
          <p className="eval-subtitle" style={{ color: "var(--color-text-danger)" }}>
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
};

/* ── Main component ── */
const UploadScripts = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [teacher,       setTeacher]       = useState(null);
  const [files,         setFiles]         = useState([]);
  const [phase,         setPhase]         = useState("idle");   // idle|uploading|queued|evaluating|done|error
  const [batchProgress, setBatchProgress] = useState(null);     // { current, total }
  const [evalProgress,  setEvalProgress]  = useState(null);     // { done, total }
  const [errorMsg,      setErrorMsg]      = useState("");
  const [dragOver,      setDragOver]      = useState(false);
  const [allKeys,       setAllKeys]       = useState([]);       // S3 keys for polling

  const fileInputRef   = useRef(null);
  const folderInputRef = useRef(null);
  const pollRef        = useRef(null);

  const exam = location.state?.exam ?? null;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    if (stored) setTeacher(stored);
  }, []);

  useEffect(() => {
    if (!exam) { navigate("/evaluation", { replace: true }); return; }
    if (exam.status !== "Active") {
      alert("Exam must be Active before uploading scripts.");
      navigate("/upload-materials", { state: { exam }, replace: true });
    }
  }, [exam, navigate]);

  /* ── Stop polling on unmount ── */
  useEffect(() => () => clearInterval(pollRef.current), []);

  /* ── File helpers ── */
  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (!valid.length) { alert("Only PDF and image files are accepted."); return; }
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.webkitRelativePath || f.name));
      return [...prev, ...valid.filter((f) => !seen.has(f.webkitRelativePath || f.name))];
    });
  };

  const removeFile  = (t) =>
    setFiles((prev) =>
      prev.filter((f) => (f.webkitRelativePath || f.name) !== (t.webkitRelativePath || t.name))
    );

  const formatSize  = (b) =>
    b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1_048_576).toFixed(1)} MB`;

  /* ── Poll OCR / eval status ── */
  const startPolling = useCallback((keys, totalCount) => {
    setEvalProgress({ done: 0, total: totalCount });

    pollRef.current = setInterval(async () => {
      try {
        const encoded = keys.map(encodeURIComponent).join(",");
        const res     = await fetch(`${API_BASE}/api/uploadscript/ocr-status?scriptKeys=${encoded}`);
        const data    = await res.json();

        const doneCount = data.statuses.filter(
          (s) => s.ocrStatus === "done" || s.ocrStatus === "failed"
        ).length;

        setEvalProgress({ done: doneCount, total: totalCount });

        if (doneCount > 0) setPhase("evaluating");

        if (data.allDone) {
          clearInterval(pollRef.current);
          setPhase("done");
          // Browser notification if tab is in background
          if (Notification?.permission === "granted") {
            new Notification("SAGE — Evaluation complete", {
              body: `${totalCount} scripts from ${exam?.course} have been evaluated.`,
            });
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, POLL_INTERVAL);
  }, [exam]);

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!files.length) { alert("Please upload at least one answer script ❌"); return; }
    if (!exam)         { alert("Exam details missing ❌"); return; }

    // Request notification permission upfront
    if (Notification?.permission === "default") Notification.requestPermission();

    setPhase("uploading");
    setErrorMsg("");

    try {
      /* ── Step 1: Upload in batches ── */
      const batches    = [];
      const fileArr    = Array.from(files);
      for (let i = 0; i < fileArr.length; i += BATCH_SIZE)
        batches.push(fileArr.slice(i, i + BATCH_SIZE));

      const collectedKeys = [];

      for (let i = 0; i < batches.length; i++) {
        setBatchProgress({ current: i + 1, total: batches.length });

        const fd = new FormData();
        fd.append("course",    exam.course);
        fd.append("examType",  exam.examType);
        fd.append("classId",   exam.classId);
        fd.append("examId",    exam._id);
        fd.append("evalType",  exam.evalType || "");
        batches[i].forEach((f) => fd.append("answer_scripts", f, f.webkitRelativePath || f.name));

        const res = await fetch(`${API_BASE}/api/uploadscript/answer-scripts`, {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Batch ${i + 1} upload failed ❌`);
        }

        const data = await res.json();
        collectedKeys.push(...(data.uploaded || data.uploadedFiles || []));
      }

      setAllKeys(collectedKeys);

      /* ── Step 2: Trigger evaluation queue ── */
      setPhase("queued");
      setBatchProgress(null);

      const evalRes = await fetch(`${API_BASE}/api/evaluation/run`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId:    exam.classId,
          course:     exam.course,
          examType:   exam.examType,
          evalType:   exam.evalType,
          scriptKeys: collectedKeys,
        }),
      });

      if (!evalRes.ok) {
        const err = await evalRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to queue evaluation ❌");
      }

      /* ── Step 3: Poll until OCR + eval finishes ── */
      startPolling(collectedKeys, collectedKeys.length);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setPhase("error");
      clearInterval(pollRef.current);
    }
  };

  const isActive = phase !== "idle";
  const isDone   = phase === "done";
  const isError  = phase === "error";

  /* ── JSX ── */
  return (
    <div className="container">

      {isActive && !isDone && !isError && (
        <StatusModal
          phase={phase}
          batchProgress={batchProgress}
          evalProgress={evalProgress}
          errorMsg={errorMsg}
        />
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">SAGE</h2>
        <div className="user-info">
          <div className="avatar">
            {teacher?.name ? teacher.name.charAt(0).toUpperCase() : "T"}
          </div>
          <div className="user-details">
            <h4>{teacher?.name || "Teacher"}</h4>
            <p>Teacher</p>
          </div>
        </div>
        <ul className="sidebar-cards">
          {NAV_ITEMS.map(({ label, icon, path, active }) => (
            <li key={label} className={active ? "active" : ""} onClick={() => navigate(path)}>
              <span className="nav-icon">{icon}</span>{label}
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="main">

        {/* ── Success screen ── */}
        {isDone ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                        justifyContent:"center", height:"70vh", gap:16, textAlign:"center" }}>
            <div style={{ fontSize:64 }}>✅</div>
            <h2 style={{ fontSize:24, fontWeight:700 }}>Evaluation Complete!</h2>
            <p style={{ color:"var(--color-text-secondary)", maxWidth:400 }}>
              All {allKeys.length} answer scripts have been uploaded and evaluated successfully.
            </p>
            <div style={{ display:"flex", gap:12, marginTop:8 }}>
              <button className="com-btn primary-btn" onClick={() => navigate("/view-mark")}>
                📊 View Results
              </button>
              <button className="com-btn view-btn" onClick={() => navigate("/evaluation")}>
                ← Back to Evaluation
              </button>
            </div>
          </div>

        ) : isError ? (
          /* ── Error screen ── */
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                        justifyContent:"center", height:"70vh", gap:16, textAlign:"center" }}>
            <div style={{ fontSize:64 }}>❌</div>
            <h2 style={{ fontSize:24, fontWeight:700 }}>Upload Failed</h2>
            <p style={{ color:"var(--color-text-danger)", maxWidth:400 }}>{errorMsg}</p>
            <div style={{ display:"flex", gap:12, marginTop:8 }}>
              <button className="com-btn primary-btn" onClick={() => setPhase("idle")}>
                ↩ Try Again
              </button>
              <button className="com-btn view-btn" onClick={() => navigate("/evaluation")}>
                ← Back to Evaluation
              </button>
            </div>
          </div>

        ) : (
          /* ── Upload screen ── */
          <div>
            <div className="logout-container">
              <button className="com-btn logout-btn-top" onClick={() => navigate("/evaluation")}>
                ↩ Back
              </button>
            </div>
            <h1 className="page-title">Upload <span>Answer Scripts</span></h1>

            {exam && (
              <div className="us-exam-banner">
                <span className="us-banner-icon">📋</span>
                <div className="us-banner-info">
                  <span className="us-banner-course">{exam.course}</span>
                  <span className="us-banner-meta">
                    {exam.classId} · {exam.examType} · <code>{exam._id}</code>
                  </span>
                </div>
                <span className="us-banner-tag">Answer Scripts Only</span>
              </div>
            )}

            {/* Drop zone */}
            <div
              className={`us-dropzone ${dragOver ? "drag-over" : ""}`}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf"
                multiple style={{ display:"none" }} onChange={(e) => addFiles(e.target.files)} />
              <input ref={folderInputRef} type="file" webkitdirectory="true" directory="" multiple
                style={{ display:"none" }} onChange={(e) => addFiles(e.target.files)} />

              <span className="us-drop-icon">📄</span>
              <p className="us-drop-title">Drop answer scripts or folders here</p>
              <p className="us-drop-sub">PDF and images accepted · large batches sent automatically in groups of {BATCH_SIZE}</p>

              <div style={{ display:"flex", gap:12, marginTop:12, justifyContent:"center" }}>
                <button className="com-btn primary-btn"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  📄 Select PDFs
                </button>
                <button className="com-btn primary-btn"
                  onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}>
                  📁 Select Folder
                </button>
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="us-file-list">
                {files.map((f) => {
                  const name = f.webkitRelativePath || f.name;
                  return (
                    <div key={name} className="us-file-row">
                      <span className="us-file-icon">📄</span>
                      <span className="us-file-name">{name}</span>
                      <span className="us-file-size">{formatSize(f.size)}</span>
                      <button className="us-file-remove" onClick={() => removeFile(f)} title="Remove">✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submit */}
            <div className="ev-proceed-row" style={{ marginTop:24 }}>
              <button
                className="com-btn primary-btn ev-proceed-btn"
                onClick={handleSubmit}
                disabled={!files.length || isActive}
              >
                {`Submit${files.length ? ` (${files.length})` : ""} Scripts →`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UploadScripts;
