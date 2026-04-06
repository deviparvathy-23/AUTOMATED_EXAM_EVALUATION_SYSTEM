import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  id: {
    type:     String,
    required: true,
    unique:   true,
  },
  name:     String,
  email:    String,
  phone:    String,
  password: String,

  // ── ADD THIS ONLY ──
  apiKeyRefs: {
    gemini:      { type: String, default: null },
  },
});

export default mongoose.model("Teacher", teacherSchema);
