import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function useEvalStatus({ classId, course, examType, enabled }) {
  const [status, setStatus] = useState(null);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !classId || !course || !examType) return;

    setFinished(false);
    setStatus(null);

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/evaluation/status?classId=${classId}&course=${encodeURIComponent(course)}&examType=${encodeURIComponent(examType)}`
        );
        const data = await res.json();
        const s = data.summary;
        setStatus(s);

        if (s.total > 0 && s.pending === 0) {
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
