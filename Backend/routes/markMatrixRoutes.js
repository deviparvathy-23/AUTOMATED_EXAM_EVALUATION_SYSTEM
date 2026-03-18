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
  if (!resultTable || typeof resultTable !== "string") {
    return { questions: [], storedTotal: null };
  }

  const rows = resultTable
    .split("\n")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("|"));

  // Need at least header, separator, data row
  if (rows.length < 3) {
    return { questions: [], storedTotal: null };
  }

  const splitRow = (row) =>
    row.split("|").map((c) => c.trim()).filter(Boolean);

  const headerCells = splitRow(rows[0]);
  // rows[1] is the separator line, skip it
  const dataCells = splitRow(rows[2]);

  // Header pattern: Roll No | Q1 | Max Marks | Marks Awarded | Justification | Q2 | ...| Total Marks
  // Data pattern:   40      | 3  | 2         | Correct...    | 3             | 3  | ...| 41.5
  // Each question block in header = 4 columns: Qn, Max Marks, Marks Awarded, Justification
  // Data columns align 1-to-1 with header columns

  const questions = [];

  headerCells.forEach((label, i) => {
    const lower = label.toLowerCase();
    // Match Qn headers (Q1, Q2, Q10...) but not "Total Marks"
    if (!lower.startsWith("q") || lower.includes("total")) return;

    // dataCells[i] = max marks for this question
    // dataCells[i+1] = marks awarded
    // dataCells[i+2] = justification
    const max          = parseFloat(dataCells[i])     || 0;
    const marksAwarded = parseFloat(dataCells[i + 1]) || 0;
    const reason       = dataCells[i + 2]             || "";

    questions.push({
      question:        label,
      max:             isNaN(max) ? 0 : max,
      marks:           isNaN(marksAwarded) ? 0 : marksAwarded,
      deductionReason: reason,
      excluded:        /not counted in total/i.test(reason),
    });
  });

  // Total is always the last data cell
  const storedTotal = parseFloat(dataCells[dataCells.length - 1]);

  return {
    questions,
    storedTotal: !isNaN(storedTotal) ? storedTotal : null,
  };
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
    const questions = parsed.questions;

    // Use the stored total from resultTable (e.g. 41.5), NOT row.totalMarks which is 0
    const total = parsed.storedTotal !== null
      ? parsed.storedTotal
      : questions
          .filter((q) => !q.excluded)
          .reduce((sum, q) => sum + parseFloat(q.marks || 0), 0);

    // Max = sum of ALL question max marks (what the student could have scored)
    const maxTotal = questions.reduce(
      (sum, q) => sum + parseFloat(q.max || 0), 0
    );

    const pct = maxTotal > 0
      ? Math.round((parseFloat(total) / maxTotal) * 100)
      : 0;

    return {
      ...row,
      questions,
      storedTotal: parsed.storedTotal,
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
