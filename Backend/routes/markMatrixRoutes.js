import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import CourseMapping from "../models/CourseMapping.js";
import Course from "../models/Course.js";
import Class from "../models/Class.js";
import MarkMatrix from "../models/MarkMatrix.js";

const router = express.Router();

/* ===============================
   AUTH MIDDLEWARE
=============================== */
const authTeacher = (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ===============================
   HELPERS
=============================== */
const normalize = (value) => String(value || "").trim().toLowerCase();

const getTeacherIdFromToken = (user) => {
  return user?._id || user?.id || user?.teacherId || null;
};

const getTeacherPairs = async (teacherId) => {
  if (!teacherId) return [];

  let teacherObjectId;
  try {
    teacherObjectId = new mongoose.Types.ObjectId(String(teacherId));
  } catch (err) {
    console.error("Invalid teacherId in token:", teacherId);
    return [];
  }

  const mappings = await CourseMapping.find({
    teacherId: teacherObjectId,
  }).lean();

  if (!mappings.length) return [];

  const pairs = await Promise.all(
    mappings.map(async (m) => {
      try {
        const [classDoc, courseDoc] = await Promise.all([
          Class.findById(m.classId).lean(),
          Course.findById(m.courseId).lean(),
        ]);

        const classString =
          classDoc?.classId || classDoc?.name || classDoc?.className || "";
        const courseString =
          courseDoc?.courseName || courseDoc?.name || courseDoc?.courseId || "";

        if (!classString || !courseString) return null;

        return {
          classId: String(classString).trim(),
          course: String(courseString).trim(),
        };
      } catch (err) {
        console.error("Error resolving mapping:", err.message);
        return null;
      }
    })
  );

  return pairs.filter(Boolean);
};

/* ===============================
   GET FILTERS
=============================== */
router.get("/filters", authTeacher, async (req, res) => {
  try {
    const teacherId = getTeacherIdFromToken(req.user);
    const validPairs = await getTeacherPairs(teacherId);

    if (!validPairs.length) {
      return res.json([]);
    }

    const filters = [];

    for (const pair of validPairs) {
      const rows = await MarkMatrix.find({
        classId: pair.classId,
        course: pair.course,
      }).select("examType");

      if (rows.length > 0) {
        filters.push({
          courseName: pair.course,
          classId: pair.classId,
          exams: [...new Set(rows.map((r) => r.examType))],
        });
      }
    }

    return res.json(filters);
  } catch (err) {
    console.error("Filter load error:", err);
    return res.status(500).json({
      message: "Failed to load filters",
      error: err.message,
    });
  }
});
/* ===============================
   PARSE RESULT TABLE
=============================== */
const parseResultTableForDisplay = (resultTable) => {
  if (!resultTable || typeof resultTable !== "string") return { questions: [] };

  const rows = resultTable
    .split("\n")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("|"));

  if (rows.length < 3) return { questions: [] };

  // ── Find Q-label positions from the header row ──────────────────────────
  // Instead of splitting by | and indexing, we find character positions of
  // each Q label in the header, then extract the same column ranges from data row

  const headerRow = rows[0];
  const dataRow   = rows[2];

  // Build an array of {label, charIndex} for every Q label in the header
  const qPositions = [];
  const headerParts = headerRow.split("|");
  let charPos = 0;

  for (let i = 0; i < headerParts.length; i++) {
    const cell = headerParts[i].trim();
    if (/^q\d+$/i.test(cell)) {
      qPositions.push({ label: cell.toUpperCase(), colIndex: i });
    }
    charPos += headerParts[i].length + 1; // +1 for the | separator
  }

  if (!qPositions.length) return { questions: [] };

  // ── Split data row by | but respect that justification may contain | ──────
  // Strategy: for each Q group, we know the column indices from the header.
  // col offset from Q label: +1=max, +2=marks, +3=justification (may span multiple splits)
  // We extract by known column count from header structure.

  const dataParts = dataRow.split("|");

  const questions = [];

  for (const { label, colIndex } of qPositions) {
    // colIndex is the position in headerParts array (includes empty first cell)
    // dataParts[colIndex] should be either the Q label (Format A) or max marks (Format B)

    let dataStart;
    if (/^q\d+$/i.test(dataParts[colIndex]?.trim())) {
      dataStart = colIndex + 1; // Format A — Q label repeated in data
    } else {
      dataStart = colIndex;     // Format B — data starts directly at colIndex
    }

    const max    = parseFloat(dataParts[dataStart]?.trim());
    const marks  = parseFloat(dataParts[dataStart + 1]?.trim());

    // Justification: join remaining parts until we hit the next Q label or Total Marks
    // Find next Q's colIndex to know where justification ends
    const currentQIdx = qPositions.indexOf(qPositions.find(q => q.label === label));
    const nextQColIndex = qPositions[currentQIdx + 1]?.colIndex;

    let justParts = [];
    const justStart = dataStart + 2;
    const justEnd   = nextQColIndex
      ? ((/^q\d+$/i.test(dataParts[nextQColIndex]?.trim()))
          ? nextQColIndex        // Format A next Q
          : nextQColIndex)       // Format B next Q
      : dataParts.length - 2;   // last Q — stop before Total Marks cell

    for (let j = justStart; j < justEnd; j++) {
      if (dataParts[j] !== undefined) justParts.push(dataParts[j]);
    }
    const reason = justParts.join("|").trim(); // re-join with | for embedded pipes

    if (!isNaN(max) && !isNaN(marks)) {
      questions.push({
        question:        label,
        max:             max,
        marks:           marks,
        deductionReason: reason,
      });
    }
  }

  return { questions };
};
/* ===============================
   GET RESULTS
=============================== */
router.get("/results", authTeacher, async (req, res) => {
  try {
    const teacherId = getTeacherIdFromToken(req.user);
    const { course, classId, examType } = req.query;

    if (!course || !classId || !examType) {
      return res.status(400).json({
        message: "course, classId and examType required",
      });
    }

    const validPairs = await getTeacherPairs(teacherId);

    const reqCourse = normalize(course);
    const reqClass = normalize(classId);
    const reqExam = String(examType).trim();

    const allowed = validPairs.some(
      (p) =>
        normalize(p.course) === reqCourse &&
        normalize(p.classId) === reqClass
    );

    if (!allowed) {
      return res.status(403).json({
        message: "This result is not mapped to the logged-in teacher",
      });
    }

    const rows = await MarkMatrix.find({
      examType: reqExam,
    }).lean();

    const filteredRows = rows
  .filter(
    (row) =>
      normalize(row.course) === reqCourse &&
      normalize(row.classId) === reqClass
  )
  .map((row) => {
  const parsed = parseResultTableForDisplay(row.resultTable);

  const total    = row.totalMarks;
  const maxTotal = row.maxMarks;
  const pct      = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  // Explicitly delete old stored questions to avoid confusion
  const { questions: _old, ...rowWithoutQuestions } = row;

  return {
    ...rowWithoutQuestions,
    questions: parsed.questions,  // always use freshly parsed questions
    total,
    maxTotal,
    pct,
  };
});

    filteredRows.sort((a, b) =>
      String(a.rollNo || "").localeCompare(String(b.rollNo || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

    return res.json(filteredRows);
  } catch (err) {
    console.error("Results load error:", err);
    return res.status(500).json({
      message: "Failed to load results",
      error: err.message,
    });
  }
});

export default router;
