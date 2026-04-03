
import mongoose from "mongoose";

const referenceAnswerSchema = new mongoose.Schema({
  course:   { type: String, required: true },
  examType: { type: String, required: true },
  classId:  { type: String, required: true },
  evalType: { type: String, required: true }, // ← ADD THIS
  pdfLink:  { type: String, required: true },
  status:   { type: Boolean, default: false },
}, { timestamps: true });

// Unique index so upsert finds the right doc
referenceAnswerSchema.index(
  { course: 1, classId: 1, examType: 1, evalType: 1 },
  { unique: true }
);

const ReferenceAnswer = mongoose.model(
  "ReferenceAnswer",
  referenceAnswerSchema,
  "referenceanswers"
);

export default ReferenceAnswer;
