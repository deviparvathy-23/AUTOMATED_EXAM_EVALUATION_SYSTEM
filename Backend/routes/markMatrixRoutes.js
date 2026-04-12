// routes/markmatricesroute.js
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

  const mappings = await CourseMapping.find({ teacherId: teacherObjectId }).lean();
  if (!mappings.length) return [];

  const pairs = await Promise.all(
    mappings.map(async (m) => {
      try {
        const [classDoc, courseDoc] = await Promise.all([
          Class.findById(m.classId).lean(),
          Course.findById(m.courseId).lean(),
        ]);
        const classString  = classDoc?.classId  || classDoc?.name  || classDoc?.className  || "";
        const courseString = courseDoc?.courseName || courseDoc?.name || courseDoc?.courseId || "";
        if (!classString || !courseString) return null;
        return { classId: String(classString).trim(), course: String(courseString).trim() };
      } catch (err) {
        console.error("Error resolving mapping:", err.message);
        return null;
      }
    })
  );

  return pairs.filter(Boolean);
};

/* ===============================
   PARSE RESULT TABLE
   Handles:
   - Sub-questions collapsed under main question number
   - Full sub-part breakdown inside Justification cell
   - Choice/optional questions marked [NOT COUNTED]
   - Pipe characters INSIDE justification text
=============================== */
const parseResultTableForDisplay = (resultTable) => {
  if (!resultTable || typeof resultTable !== "string") return { questions: [] };

  const rows = resultTable
    .split("\n")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("|"));

  if (rows.length < 3) return { questions: [] };

  const headerRow = rows[0];
  const dataRow   = rows[2];

  const headerParts = headerRow.split("|").map((c) => c.trim());

  // Match only main question labels: Q1, Q2, Q10 etc. (no sub-labels like Q6A, Q6B)
  const qLabels = headerParts
    .filter((c) => /^Q\d+$/i.test(c))
    .map((c) => c.toUpperCase());

  if (!qLabels.length) return { questions: [] };

  const escapedLabels = qLabels.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const normalizedDataRow = dataRow.replace(/\|\s*(Q\d+)\s+([A-Z])\s*\|/gi, "|$1$2|");

  const isFormatA = new RegExp(`\\|\\s*${escapedLabels[0]}\\s*\\|`, "i").test(normalizedDataRow);

  const questions = [];

  if (isFormatA) {
    const splitPattern = new RegExp(`\\|\\s*(${escapedLabels.join("|")})\\s*\\|`, "gi");
    const matches = [...normalizedDataRow.matchAll(splitPattern)];

    for (let i = 0; i < matches.length; i++) {
      const label    = matches[i][1].toUpperCase().replace(/\s+/g, "");
      const segStart = matches[i].index + matches[i][0].length;
      const segEnd   = matches[i + 1]?.index ?? normalizedDataRow.lastIndexOf("|", normalizedDataRow.lastIndexOf("|") - 1);
      const segment  = normalizedDataRow.slice(segStart, segEnd);

      const firstPipe  = segment.indexOf("|");
      const secondPipe = segment.indexOf("|", firstPipe + 1);

      const max     = parseFloat(segment.slice(0, firstPipe).trim());
      const marks   = parseFloat(segment.slice(firstPipe + 1, secondPipe).trim());
      const rawJust = segment.slice(secondPipe + 1);
      const reason  = rawJust.replace(/\s*\|\s*$/, "").trim();

      if (!isNaN(max) && !isNaN(marks)) {
        questions.push({ question: label, max, marks, deductionReason: reason });
      }
    }

  } else {
    const qColIndices = qLabels.map((q) => ({
      label:    q,
      colIndex: headerParts.findIndex((c) => c.replace(/\s+/g, "").toUpperCase() === q),
    }));

    const dataCells = dataRow.split("|").map((c) => c.trim());

    for (let qi = 0; qi < qColIndices.length; qi++) {
      const { label, colIndex } = qColIndices[qi];

      const max   = parseFloat(dataCells[colIndex + 1]);
      const marks = parseFloat(dataCells[colIndex + 2]);

      const nextColIndex = qColIndices[qi + 1]?.colIndex ?? (dataCells.length - 2);
      const justCells    = dataCells.slice(colIndex + 3, nextColIndex);
      const reason       = justCells.join("|").trim();

      if (!isNaN(max) && !isNaN(marks)) {
        questions.push({ question: label, max, marks, deductionReason: reason });
      }
    }
  }

  return { questions };
};

/* ===============================
   COMPUTE TOTAL FROM PARSED QUESTIONS
   - Skips questions marked [NOT COUNTED] in justification
   - Skips NaN marks (not attempted)
   - Returns sum of valid marks only
=============================== */
const computeTotalFromQuestions = (questions) => {
  return questions.reduce((sum, q) => {
    const reason = String(q.deductionReason || "").toUpperCase();

    // Skip choice/optional questions that were not counted
    if (reason.includes("NOT COUNTED")) return sum;

    // Skip not attempted
    if (isNaN(q.marks)) return sum;

    return sum + q.marks;
  }, 0);
};

/* ===============================
   EXTRACT TOTAL FROM RAW RESULT TABLE STRING
   - Finds "Total Marks" column by header name first
   - Falls back to last purely numeric cell
=============================== */
export const extractTotal = (resultTable) => {
  if (!resultTable) return null;

  const lines = resultTable
    .split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));

  if (lines.length < 3) return null;

  // Skip separator rows
  const dataRows = lines.slice(1).filter((l) => !/^[\|\s\-:]+$/.test(l));
  if (dataRows.length === 0) return null;

  const dataRow = dataRows[dataRows.length - 1];

  // ── Try to find "Total Marks" column by header name ──────────────────────
  const headerRow   = lines[0];
  const headerCells = headerRow.split("|").map((c) => c.trim());
  const totalColIdx = headerCells.findIndex((c) => /^total\s*marks$/i.test(c));

  if (totalColIdx !== -1) {
    const dataCells = dataRow.split("|").map((c) => c.trim());
    const cell      = dataCells[totalColIdx] ?? "";
    const cleaned   = String(cell).replace(/[^\d.]/g, "");
    if (cleaned !== "") {
      const n = Number(cleaned);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }

  // ── Fallback: scan from end for last purely numeric cell ──────────────────
  // Avoids picking up max marks or justification fragments
  const dataCells = dataRow.split("|").map((c) => c.trim()).filter(Boolean);
  for (let i = dataCells.length - 1; i >= 0; i--) {
    const cell    = dataCells[i];
    const cleaned = String(cell).replace(/[^\d.]/g, "");
    if (cleaned === "" || cleaned !== cell.trim()) continue;
    const n = Number(cleaned);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
};

/* ===============================
   GET FILTERS
=============================== */
router.get("/filters", authTeacher, async (req, res) => {
  try {
    const teacherId  = getTeacherIdFromToken(req.user);
    const validPairs = await getTeacherPairs(teacherId);

    if (!validPairs.length) return res.json([]);

    const filters = [];
    for (const pair of validPairs) {
      const rows = await MarkMatrix.find({
        classId: pair.classId,
        course:  pair.course,
      }).select("examType");

      if (rows.length > 0) {
        filters.push({
          courseName: pair.course,
          classId:    pair.classId,
          exams:      [...new Set(rows.map((r) => r.examType))],
        });
      }
    }

    return res.json(filters);
  } catch (err) {
    console.error("Filter load error:", err);
    return res.status(500).json({ message: "Failed to load filters", error: err.message });
  }
});

/* ===============================
   GET RESULTS
=============================== */
router.get("/results", authTeacher, async (req, res) => {
  try {
    const teacherId = getTeacherIdFromToken(req.user);
    const { course, classId, examType } = req.query;

    if (!course || !classId || !examType) {
      return res.status(400).json({ message: "course, classId and examType required" });
    }

    const validPairs = await getTeacherPairs(teacherId);

    const reqCourse = normalize(course);
    const reqClass  = normalize(classId);
    const reqExam   = String(examType).trim();

    const allowed = validPairs.some(
      (p) => normalize(p.course) === reqCourse && normalize(p.classId) === reqClass
    );

    if (!allowed) {
      return res.status(403).json({ message: "This result is not mapped to the logged-in teacher" });
    }

    const rows = await MarkMatrix.find({ examType: reqExam }).lean();

    const filteredRows = rows
      .filter(
        (row) =>
          normalize(row.course)  === reqCourse &&
          normalize(row.classId) === reqClass
      )
      .map((row) => {
        // Parse questions from resultTable string
        const parsed = parseResultTableForDisplay(row.resultTable);

        // ── Recompute total from parsed questions ──────────────────────────
        // This overrides the stored totalMarks which may be wrong due to
        // choice question double-counting or extraction bugs.
        // NOT COUNTED questions (choice/optional) are excluded from sum.
        const recomputedTotal = computeTotalFromQuestions(parsed.questions);

        // Use recomputed total if valid, otherwise fall back to stored value
        const total    = recomputedTotal > 0 ? recomputedTotal : (row.totalMarks ?? 0);
        const maxTotal = row.maxMarks ?? 0;
        const pct      = maxTotal > 0
          ? Math.round((total / maxTotal) * 100)
          : 0;

        const { questions: _old, ...rowWithoutQuestions } = row;

        return {
          ...rowWithoutQuestions,
          questions: parsed.questions,
          total,
          maxTotal,
          pct,
        };
      });

    filteredRows.sort((a, b) =>
      String(a.rollNo || "").localeCompare(String(b.rollNo || ""), undefined, {
        numeric:     true,
        sensitivity: "base",
      })
    );

    return res.json(filteredRows);
  } catch (err) {
    console.error("Results load error:", err);
    return res.status(500).json({ message: "Failed to load results", error: err.message });
  }
});

export default router;
