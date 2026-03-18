import express from "express";
import path from "path";
import mime from "mime-types";
import PDFDocument from "pdfkit";

import s3 from "../utils/s3Client.js";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { GoogleGenAI } from "@google/genai";

import MarkMatrix    from "../models/MarkMatrix.js";   // ✅ existing — evaluation results
import Result        from "../models/Result.js";        // ✅ new — OCR extracted text
import ReferenceAnswer from "../models/ReferenceAnswer.js";
import { Buffer } from "buffer";

// ─── Helper: strip empty first/last cells from split("|") ───────────────────
function splitRow(line) {
  const parts = line.split("|");
  return parts
    .filter((_, i, arr) => i !== 0 && i !== arr.length - 1)
    .map((c) => c.trim());
}

// ─── Helper: extract awarded total — always the LAST cell of the last row ────
function extractTotal(resultTable) {
  if (!resultTable) return null;

  const lines = resultTable
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));

  if (lines.length < 3) return null;

  const dataRow  = splitRow(lines[lines.length - 1]);
  const lastCell = dataRow[dataRow.length - 1];

  console.log("🔍 [extractTotal] lastCell:", lastCell);

  const n = Number(String(lastCell).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ─── Helper: extract max marks from Gemini's MAX_MARKS: line ─────────────────
function extractMaxMarks(fullText) {
  const match = fullText.match(/MAX_MARKS:\s*([\d.]+)/i);
  if (!match) {
    console.log("🔍 [extractMaxMarks] MAX_MARKS line not found");
    return null;
  }
  const n = Number(match[1]);
  console.log("🔍 [extractMaxMarks] found:", n);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function guessMime(key) {
  return mime.lookup(key) || "application/octet-stream";
}

function rollNoFromKey(key) {
  return path.parse(key.split("/").pop()).name;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function downloadFromS3(bucket, key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return await streamToBuffer(res.Body);
}

async function uploadToS3(bucket, key, buffer, mimeType) {
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType })
  );
}

function textToPDFBuffer(text) {
  const doc = new PDFDocument();
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));
  doc.text(text);
  doc.end();
  return new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(buffers))));
}

async function listPdfsS3(bucket, prefix) {
  const out = [];
  let token;
  while (true) {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    for (const obj of res.Contents || []) {
      const key = obj.Key;
      if (key && key.toLowerCase().endsWith(".pdf")) {
        out.push({
          key,
          lastModified: obj.LastModified ? new Date(obj.LastModified) : new Date(0),
        });
      }
    }
    if (!res.IsTruncated) break;
    token = res.NextContinuationToken;
  }
  out.sort((a, b) => b.lastModified - a.lastModified);
  return out.map((x) => x.key);
}

// ─── Reference Answer Generation ────────────────────────────────────────────

const REFERENCE_PROMPT = `
You are a senior academic examiner. Generate concise, mark-scoring reference answers for ALL questions in the Question Paper.

CRITICAL FIRST STEP — READ THE QUESTION PAPER CAREFULLY:
* Identify every question and its exact mark value directly from the question paper.
* Do not assume any fixed mark scheme. Marks vary per question.
* The number of bullet points for each answer MUST exactly equal the marks assigned to that question.

ANSWER FORMAT RULES:
* For every question: number of bullet points = number of marks for that question.
* Each bullet point = one scorable fact/concept (1 sentence max, under 20 words).
* No paragraphs, no elaboration, no examples unless directly mark-worthy.
* Every point must be something an examiner would award a mark for.
* If a question has sub-parts, allocate bullets proportionally to each sub-part's marks, clearly labelled.

OUTPUT FORMAT (follow strictly for every question, no exceptions):

--------------------------------------------------
Question No: [Number]
Marks: [Exact marks as shown in question paper]

Reference Answer:
- [Scoring point 1]
- [Scoring point 2]
- [continue until bullet count matches marks]
--------------------------------------------------

CRITICAL INSTRUCTIONS:
* You MUST generate answers for ALL questions in the paper. Do not stop early.
* Read the mark allocation from the question paper — never assume or guess marks.
* Do not write any introduction or conclusion outside the format above.
* Do not skip any question even if the answer seems obvious.
* Bullet count must match marks exactly — no more, no fewer.
`.trim();

async function generateReferenceAnswers(ai, course, classId, examType, qpKey, qpBytes, msKey, msBytes) {
  const BUCKET = process.env.S3_BUCKET;

  const contents = [
    { role: "user", parts: [{ text: REFERENCE_PROMPT }] },
    {
      role: "user",
      parts: [{ inlineData: { data: qpBytes.toString("base64"), mimeType: guessMime(qpKey) } }],
    },
  ];

  if (msBytes && msKey) {
    contents.push({
      role: "user",
      parts: [{ inlineData: { data: msBytes.toString("base64"), mimeType: guessMime(msKey) } }],
    });
  }

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    config: { temperature: 0.1, topP: 0.9, topK: 10, maxOutputTokens: 32768 },
    contents,
  });

  let finalText = "";
  for await (const chunk of stream) {
    const text =
      chunk?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    finalText += text;
  }

  if (!finalText) throw new Error("Empty reference answer result from Gemini");

  const s3Key = `${course}/${classId}/${examType}/reference-answers/reference.pdf`;
  const pdfBuffer = await textToPDFBuffer(finalText);
  await uploadToS3(BUCKET, s3Key, pdfBuffer, "application/pdf");

  const refAnswer = await ReferenceAnswer.findOneAndUpdate(
    { course, classId, examType },
    { course, classId, examType, pdfLink: s3Key, status: false },
    { upsert: true, new: true }
  );

  return refAnswer;
}

// ─── Router ──────────────────────────────────────────────────────────────────

const router = express.Router();
const MODEL = "gemini-2.5-flash";

// ✅ evalType stressed 3 times in prompt
const buildEvalPrompt = (evalType) => `
You are an expert academic evaluator.

════════════════════════════════════════════════════════════════
⚠️  EVALUATION TYPE — THIS IS YOUR PRIMARY INSTRUCTION:
${evalType}

You MUST strictly follow this evaluation type for EVERY question and EVERY mark decision.
This overrides any default assumptions you may have about marking.
Do NOT deviate from this evaluation type under any circumstance.
════════════════════════════════════════════════════════════════

INPUTS PROVIDED:
1. Question Paper — use this to identify ALL questions and their exact max marks
2. Marking Scheme (if provided) — use as secondary reference for awarding marks
3. Official Textbook Content (if provided) — use as primary content reference
4. Student Answer Sheet (File name = Student Roll Number)

STEP 1 — READ THE QUESTION PAPER FIRST:
* Identify every question number and its exact max marks as printed in the question paper.
* Sum all question max marks to get the total maximum marks for this paper.
* Output this on the very first line of your response as: MAX_MARKS: [number]
* Do NOT guess or assume max marks — read them directly from the question paper.

STEP 2 — EVALUATE EVERY QUESTION:
* You MUST evaluate EVERY question in the question paper — do not skip any.
* Students may have answered extra questions — evaluate ONLY the questions listed in the question paper.
* For each question, apply the EVALUATION TYPE strictly while deciding marks.
* Award full / partial / zero marks along with a concise justification per question.
* If a question was not attempted by the student, award 0 with justification "Not attempted".

════════════════════════════════════════════════════════════════
⚠️  EVALUATION TYPE REMINDER — apply this to every single mark decision:
${evalType}
════════════════════════════════════════════════════════════════

OUTPUT FORMAT — your entire response must follow this exact structure, nothing else:

MAX_MARKS: [total maximum marks from the question paper]

| Roll No | Q1 | Max Marks | Marks Awarded | Justification | Q2 | Max Marks | Marks Awarded | Justification | ... (repeat for ALL questions) | Total Marks |
|---|---|---|---|---|---|---|---|---|---|
| [rollNo] | [Q1 label] | [max] | [awarded] | [justification] | ... | [total awarded] |

CRITICAL OUTPUT RULES:
- Line 1 MUST be: MAX_MARKS: [number]
- Line 2 MUST be blank
- Line 3 onwards: the markdown table starting with | Roll No |
- Output the table in ONE single complete response — do not stop mid-row
- Every row must be complete from Roll No to Total Marks
- Do NOT add any other text, preamble, explanation, or conclusion
- Do NOT say "Here is the evaluation" or anything similar
`.trim();

/**
 * POST /api/evaluation/run
 * body: { classId, course, examType, evalType, force?, scriptKeys }
 */
router.post("/run", async (req, res) => {
  try {
    const { classId, course, examType, evalType, force, scriptKeys } = req.body || {};

    if (!classId || !course || !examType || !evalType) {
      return res.status(400).json({ error: "classId, course, examType, evalType are required" });
    }

    const BUCKET = process.env.S3_BUCKET;
    if (!BUCKET) return res.status(500).json({ error: "Missing S3_BUCKET in Backend .env" });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY in Backend .env" });

    const basePrefix = `${course}/${classId}/${examType}`;
    const qpPrefix   = `${basePrefix}/question-paper/`;
    const msPrefix   = `${basePrefix}/marking-scheme/`;
    const refPrefix  = `${basePrefix}/reference-text/`;

    const [qpPdfs, msPdfs, refPdfs] = await Promise.all([
      listPdfsS3(BUCKET, qpPrefix),
      listPdfsS3(BUCKET, msPrefix),
      listPdfsS3(BUCKET, refPrefix),
    ]);

    if (!scriptKeys || scriptKeys.length === 0) {
      return res.status(400).json({ error: "No scripts provided for evaluation" });
    }

    const scriptPdfs = scriptKeys
      .map((s) => (typeof s === "string" ? s : s.key))
      .filter(Boolean);

    console.log("📥 Scripts received from frontend:", scriptPdfs);

    if (!qpPdfs.length) {
      return res.status(400).json({ error: `No Question Paper PDFs found at prefix: ${qpPrefix}` });
    }
    if (!scriptPdfs.length) {
      return res.status(400).json({ error: "No valid script keys provided" });
    }

    const qpKey  = qpPdfs[0];
    const msKey  = msPdfs[0]  || null;
    const refKey = refPdfs[0] || null;

    console.log("\n=== EVALUATION RUN ===");
    console.log("classId:", classId, "| course:", course, "| examType:", examType);
    console.log("evalType:", evalType);
    console.log("force:", !!force, "| bucket:", BUCKET);
    console.log("QP:", qpKey, "| MS:", msKey, "| REF:", refKey);
    console.log("scripts found:", scriptPdfs.length);

    const [qpBytes, msBytes, refBytes] = await Promise.all([
      downloadFromS3(BUCKET, qpKey),
      msKey  ? downloadFromS3(BUCKET, msKey)  : Promise.resolve(null),
      refKey ? downloadFromS3(BUCKET, refKey) : Promise.resolve(null),
    ]);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let processed       = 0;
    let newlySaved      = 0;
    let updatedExisting = 0;
    let skippedExisting = 0;
    const failures      = [];

    // ── Evaluation loop ──────────────────────────────────────────────────────
    for (const scriptKey of scriptPdfs) {
      processed++;
      const rollNo = rollNoFromKey(scriptKey);

      try {
        const exists = await MarkMatrix.findOne({ scriptKey }).lean();
        if (exists && !force) {
          console.log("⏭ Skipping already evaluated:", scriptKey);
          skippedExisting++;
          continue;
        }

        console.log(`\n---- Evaluating (${processed}/${scriptPdfs.length}): ${scriptKey} ----`);

        const scriptBytes = await downloadFromS3(BUCKET, scriptKey);

        // ✅ Check Result collection for pre-extracted OCR text
        const ocrRecord = await Result.findOne(
          { scriptKey },
          { extractedText: 1, ocrStatus: 1 }
        ).lean();

        const hasOcrText = ocrRecord?.ocrStatus === "done" && !!ocrRecord?.extractedText;

        if (hasOcrText) {
          console.log(`  ✅ Using pre-extracted OCR text from Result collection (${ocrRecord.extractedText.length} chars)`);
        } else {
          console.log(`  ℹ️  No OCR text found in Result — Gemini will read PDF directly`);
        }

        const contents = [
          { role: "user", parts: [{ text: buildEvalPrompt(evalType) }] },
          {
            role: "user",
            parts: [{ inlineData: { data: qpBytes.toString("base64"), mimeType: guessMime(qpKey) } }],
          },
        ];

        if (msBytes && msKey) {
          contents.push({
            role: "user",
            parts: [{ inlineData: { data: msBytes.toString("base64"), mimeType: guessMime(msKey) } }],
          });
        }

        if (refBytes && refKey) {
          contents.push({
            role: "user",
            parts: [{ inlineData: { data: refBytes.toString("base64"), mimeType: guessMime(refKey) } }],
          });
        }

        // ✅ if OCR text exists in Result → send as text (transparent + accurate)
        // otherwise fall back to raw PDF → Gemini Vision
        if (hasOcrText) {
          contents.push({
            role: "user",
            parts: [{ text: `Student Answer Sheet (Roll No: ${rollNo}):\n\n${ocrRecord.extractedText}` }],
          });
        } else {
          contents.push({
            role: "user",
            parts: [{ inlineData: { data: scriptBytes.toString("base64"), mimeType: guessMime(scriptKey) } }],
          });
        }

        const stream = await ai.models.generateContentStream({
          model: MODEL,
          config: { temperature: 0.1, topP: 0.9, topK: 10, maxOutputTokens: 32768 },
          contents,
        });

        let finalText = "";
        for await (const chunk of stream) {
          const text =
            chunk?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
          finalText += text;
        }

        // ✅ extract maxMarks from Gemini's MAX_MARKS: line
        const maxMarks = extractMaxMarks(finalText);

        const tableStart = finalText.indexOf("| Roll No");
        if (tableStart === -1) throw new Error("Gemini did not return a valid table");
        const resultTable = finalText.slice(tableStart).trim();
        if (!resultTable) throw new Error("Empty result from Gemini");

        // ✅ extract totalMarks from last cell of last data row
        const totalMarks = extractTotal(resultTable);

        console.log(`📊 rollNo=${rollNo} | totalMarks=${totalMarks} | maxMarks=${maxMarks}`);

        // ✅ save evaluation result to MarkMatrix (existing collection — untouched)
        await MarkMatrix.updateOne(
          { scriptKey },
          {
            $set: {
              rollNo, scriptKey, classId, course, examType,
              resultTable,
              totalMarks,
              maxMarks,
              status: "done",
              error:  "",
            },
          },
          { upsert: true }
        );

        if (exists) updatedExisting++; else newlySaved++;
        console.log(`✅ Saved to MarkMatrix: rollNo=${rollNo} | totalMarks=${totalMarks} | maxMarks=${maxMarks}`);

      } catch (e) {
        console.error("❌ Failed script:", scriptKey, e?.message || e);

        await MarkMatrix.updateOne(
          { scriptKey },
          {
            $set: {
              rollNo, scriptKey, classId, course, examType,
              resultTable: "",
              status:      "failed",
              error:       e?.message || String(e),
              updatedAt:   new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        failures.push({ scriptKey, error: e?.message || String(e) });
      }
    }

    // ── Generate reference answers after evaluation ───────────────────────────
    let referenceAnswer      = null;
    let referenceAnswerError = null;

    try {
      console.log("\n=== GENERATING REFERENCE ANSWERS ===");
      referenceAnswer = await generateReferenceAnswers(
        ai, course, classId, examType, qpKey, qpBytes, msKey, msBytes
      );
      console.log("✅ Reference answers saved:", referenceAnswer?.pdfLink);
    } catch (refErr) {
      referenceAnswerError = refErr?.message || String(refErr);
      console.error("❌ Reference answer generation failed:", referenceAnswerError);
    }

    return res.json({
      ok: true,
      message: "Evaluation finished",
      classId, course, examType,
      bucket: BUCKET,
      force: !!force,
      used: { questionPaper: qpKey, markingScheme: msKey, referenceText: refKey },
      totalScriptsFound: scriptPdfs.length,
      processed, newlySaved, updatedExisting, skippedExisting,
      failuresCount: failures.length,
      failures,
      referenceAnswer: referenceAnswer
        ? { pdfLink: referenceAnswer.pdfLink, status: referenceAnswer.status }
        : null,
      referenceAnswerError,
    });

  } catch (err) {
    console.error("Evaluation route error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Evaluation failed. Check backend console.",
    });
  }
});

export default router;
