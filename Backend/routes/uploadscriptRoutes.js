import express  from "express";
import multer   from "multer";
import path     from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Result           from "../models/Result.js";

const router = express.Router();
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 15 },
  fileFilter: (_, file, cb) =>
    cb(null, file.originalname.toLowerCase().endsWith(".pdf")),
});

/* ── POST /answer-scripts ────────────────────────────────────────────────── */
router.post("/answer-scripts", upload.array("answer_scripts", 15), async (req, res) => {
  try {
    const { course, examType, classId, examId, evalType } = req.body;

    if (!course || !examType || !classId || !examId || !evalType)
      return res.status(400).json({ error: "course, examType, classId, examId and evalType are required." });
    if (!req.files?.length)
      return res.status(400).json({ error: "No files uploaded." });

    const meta = { course, examType, classId, examId, evalType };

    const uploadedKeys = [];
    for (const file of req.files) {
      const originalName = path.basename(file.originalname);
      const key    = `${course}/${classId}/${examType}/${evalType}/answer-scripts/${originalName}`;
      const rollNo = path.parse(originalName).name;

      await s3.send(new PutObjectCommand({
        Bucket:      process.env.S3_BUCKET,
        Key:         key,
        Body:        file.buffer,
        ContentType: "application/pdf",
      }));

      await Result.updateOne(
        { scriptKey: key },
        { $set: { rollNo, scriptKey: key, ...meta } },
        { upsert: true }
      );

      uploadedKeys.push(key);
    }

    res.json({
      message:       `${uploadedKeys.length} scripts uploaded ✅`,
      uploaded:      uploadedKeys,
      uploadedFiles: uploadedKeys,
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed ❌" });
  }
});

/* ── GET /ocr-status ─────────────────────────────────────────────────────── */
router.get("/ocr-status", async (req, res) => {
  try {
    const keys = (req.query.scriptKeys || "")
      .split(",").map(k => decodeURIComponent(k.trim())).filter(Boolean);
    if (!keys.length) return res.json({ allDone: true, statuses: [] });

    const records = await Result.find(
      { scriptKey: { $in: keys } },
      { scriptKey: 1, ocrStatus: 1, ocrError: 1 }
    ).lean();

    const statuses = keys.map(key => {
      const r = records.find(r => r.scriptKey === key);
      return { scriptKey: key, ocrStatus: r?.ocrStatus ?? "pending", ocrError: r?.ocrError ?? "" };
    });

    res.json({
      allDone: statuses.every(s => s.ocrStatus === "done" || s.ocrStatus === "failed"),
      statuses,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
