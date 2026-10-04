// removes "1. " or "2) " that the AI may leave at the start
export const clean = (t = "") => t.replace(/^\s*\d+\s*[.)]\s*/, "");

// "shape:triangle" -> "triangle" (for plain text places)
export const pretty = (s = "") => String(s).replace(/shape:\s*/gi, "");