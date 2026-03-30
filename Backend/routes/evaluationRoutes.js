import express    from "express";
import MarkMatrix from "../models/MarkMatrix.js";
import { evalQueue } from "../utils/evalQueue.js";

const router = express.Router();
evalQueue.on("error", (err) => console.error("❌ Queue error:", err.message));
/* POST /api/evaluation/run — enqueue papers */
router.post("/run", async (req, res) => {
  try {
    const { classId, course, examType, evalType, force, scriptKeys } = req.body || {};

    if (!classId || !course || !examType || !evalType)
      return res.status(400).json({ error: "classId, course, examType, evalType required" });
    if (!scriptKeys?.length)
      return res.status(400).json({ error: "No scripts provided" });

    // Mark all as pending immediately so status endpoint shows them
    await Promise.all(
      scriptKeys.map((scriptKey) =>
        MarkMatrix.updateOne(
          { scriptKey },
          { $set: { status: "pending", error: "", classId, course, examType } },
          { upsert: true }
        )
      )
    );

console.log("📥 [EVAL] Request received:", { classId, course, examType, count: scriptKeys?.length });
    // Enqueue one job per paper
    await Promise.all(
      scriptKeys.map((scriptKey) =>
        evalQueue.add({
          classId, course, examType, evalType,
          force: force || false,
          scriptKey,
        })
      )
    );
    console.log("✅ [EVAL] Jobs enqueued to Redis");

    res.json({
      ok:      true,
      message: `${scriptKeys.length} papers queued for evaluation`,
      classId, course, examType,
    });

  } catch (err) {
    console.error("Evaluation route error:", err);
    if (!res.headersSent)
      res.status(500).json({ ok: false, error: err?.message });
  }
});

/* GET /api/evaluation/status — frontend polls this */
router.get("/status", async (req, res) => {
  try {
    const { classId, course, examType } = req.query;
    const rows = await MarkMatrix.find(
      { classId, course, examType },
      { rollNo: 1, status: 1, error: 1, totalMarks: 1, maxMarks: 1 }
    ).lean();

    res.json({
      summary: {
        total:   rows.length,
        done:    rows.filter((r) => r.status === "done").length,
        pending: rows.filter((r) => r.status === "pending").length,
        failed:  rows.filter((r) => r.status === "failed").length,
      },
      rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
