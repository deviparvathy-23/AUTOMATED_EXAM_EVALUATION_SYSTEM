import {
  getNextApiKey,
  markKeyUsed,
  markKeyFailed,
} from "./geminiKeyManager.js";
import { getTeacherKey } from "./teacherKeyManager.js";

export async function getApiKey(provider, teacherId) {

  // ── Gemini → try general pool first, fall back to teacher key ──
  if (provider === "gemini") {
    try {
      const keyObj = await getNextApiKey();
      return {
        key:          keyObj.key,
        label:        keyObj.label,
        source:       "general",
        markKeyUsed,
        markKeyFailed,
      };
    } catch (err) {
      console.warn("⚠️ General Gemini pool exhausted, trying teacher key...");
      const teacherKey = await getTeacherKey(teacherId, "gemini");
      if (!teacherKey) {
        throw new Error(
          "All Gemini keys exhausted and you have not added your own Gemini key. Please add one in API Key Settings."
        );
      }
      return { key: teacherKey, source: "teacher" };
    }
  }

  // ── Other providers → teacher key only ──
  const teacherKey = await getTeacherKey(teacherId, provider);
  if (!teacherKey) {
    throw new Error(
      `No key configured for ${provider}. Please add your own API key in API Key Settings.`
    );
  }
  return { key: teacherKey, source: "teacher" };
}