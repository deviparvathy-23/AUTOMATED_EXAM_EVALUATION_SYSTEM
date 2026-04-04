import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function useEvalStatus({ classId, course, examType, enabled }) {
  const [status, setStatus] = useState(null);
  const [finished, setFinished] = useState(false);
  const seenPending = useRef(false); // ← key fix
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !classId || !course || !examType) return;

    setFinished(false);
    setStatus(null);
    seenPending.current = false; // reset on new eval

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/evaluation/status?classId=${classId}&course=${encodeURIComponent(course)}&examType=${encodeURIComponent(examType)}`
        );
        const data = await res.json();
        const s = data.summary;
        setStatus(s);

        // Wait until we see at least 1 pending paper first
        if (s.pending > 0) {
          seenPending.current = true;
        }

        // Only fire finished AFTER we saw pending papers go to 0
        if (seenPending.current && s.pending === 0 && s.total > 0) {
          clearInterval(intervalRef.current);
          setFinished(true);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 4000);

    return () => clearInterval(intervalRef.current);
  }, [enabled, classId, course, examType]);

  return { status, finished };
}
