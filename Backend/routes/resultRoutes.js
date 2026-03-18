// routes/resultRoutes.js
import express from "express";
import MarkMatrix from "../models/MarkMatrix.js";
import Result from "../models/Result.js";

const router = express.Router();

router.get("/student", async (req, res) => {
  const { rollNo, scriptKey } = req.query;
  const query = scriptKey ? { scriptKey } : { rollNo };

  const marks = await MarkMatrix.findOne(query).lean();
  const ocr   = await Result.findOne(query).lean();

  if (!marks && !ocr)
    return res.status(404).json({ error: "Result not found" });

  return res.json({
    ...marks,
    extractedText: ocr?.extractedText || "",
    ocrStatus:     ocr?.ocrStatus     || null,
  });
});

router.get("/student", async (req, res) => {
  const { rollNo, scriptKey } = req.query;
  const query = scriptKey ? { scriptKey } : { rollNo };
  const ocr   = await Result.findOne(query).lean();
  if (!ocr) return res.status(404).json({ error: "Result not found" });
  return res.json(ocr);
});


export default router;
