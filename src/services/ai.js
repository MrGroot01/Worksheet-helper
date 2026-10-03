const MODEL = import.meta.env.VITE_MODEL || "qwen/qwen3.8-27b";
export const API_KEY = import.meta.env.VITE_API_KEY;

const EXTRACT_PROMPT = `This is a school worksheet photo (young children, English). Rebuild it as a BLANK worksheet. IGNORE any handwritten answers, ticks or lines drawn by a student. Do NOT solve anything.
Return ONLY JSON:
{"title":"","sections":[{"title":"section heading with instruction","type":"match|fill|short","wordBox":["..."],"options":["..."],"emojis":{"Hand":"✋"},"questions":[{"text":"question text"}]}]}
Rules:
- Do NOT put question numbers inside "text".
- match: "options" = right column words; each question text = left word. "emojis" = one fitting emoji for EVERY left and right word (key = the exact word).
- fill: put "____" exactly where the blank is and keep the rest of the sentence. If a word box exists put it in "wordBox".
- short: questions that need a written answer, including write-the-rhyming-word and write-5-items type questions (use "____" if there is a blank).`;

function extractJson(text) {
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI did not return valid data. Try again.");
  return JSON.parse(clean.slice(start, end + 1));
}

async function callGroq(content) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
      max_completion_tokens: 8000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "API error");
  return extractJson(data.choices?.[0]?.message?.content || "");
}

// accepts {"answers":[{id,answer}]} or {"answers":{id:answer}} or {id:answer}
function toMap(out) {
  const src = out?.answers ?? out ?? {};
  const map = {};
  if (Array.isArray(src)) {
    src.forEach((a) => {
      if (a && a.id !== undefined) map[a.id] = String(a.answer ?? "").trim();
    });
  } else {
    Object.entries(src).forEach(([k, v]) => {
      map[k] = String(v ?? "").trim();
    });
  }
  return map;
}

function contextText(info = {}) {
  const lines = [
    `This worksheet is from an English textbook for CBSE Class ${info.cls || "1"} in India (young children).`,
  ];
  if (info.book?.trim()) lines.push(`Book / lesson: ${info.book.trim()}.`);
  if (info.story?.trim()) lines.push(`Lesson text from the book:\n"""\n${info.story.trim()}\n"""`);
  return lines.join("\n");
}

async function solveOnce(paper, info) {
  const input = paper.sections.map((s) => ({
    title: s.title,
    type: s.type,
    wordBox: s.wordBox || [],
    options: s.options || [],
    questions: s.questions.map((q) => ({ id: q.id, text: q.text })),
  }));
  const hasStory = !!info?.story?.trim();

  const out = await callGroq([
    {
      type: "text",
      text: `You are a careful English teacher. Solve EVERY question on this worksheet. Never leave an answer empty.
${contextText(info)}
Return ONLY JSON in this exact shape: {"answers":[{"id":"s0q0","answer":"..."}]} with one entry for every question id.
Rules:
- match: answer = EXACTLY one word from that section's "options". Each option is used only once. Match by meaning (body part to clothing/item, animal, fruit, flower, vegetable...).
- fill with a wordBox: answer = EXACTLY the word or letter from the wordBox.
- fill with a letter blank (like "____ air"): answer = only the missing letter(s) so the word is spelled correctly. If a wordBox has letters, answer must be one of them.
- short with exactly one correct answer: write the short answer.
- OPEN questions (many answers possible, like rhyming words, "write 5 food items", "your favourite..."): start with "e.g. " and give an example.
- Questions about a story or lesson: ${
        hasStory
          ? "answer ONLY from the lesson text above, in a short simple sentence. Do not add (guess)."
          : "use the book/lesson name and your knowledge of common CBSE Class 1 English lessons. If you are not sure, give the most likely short answer and start it with \"(guess) \"."
      }
Worksheet:
${JSON.stringify(input)}`,
    },
  ]);

  return toMap(out);
}

async function solve(paper, info) {
  const total = paper.sections.reduce((n, s) => n + s.questions.length, 0);
  let map = await solveOnce(paper, info);
  const filled = (m) => Object.values(m).filter(Boolean).length;
  if (filled(map) < total * 0.8) {
    const second = await solveOnce(paper, info); // one retry
    if (filled(second) > filled(map)) map = second;
  }
  return map;
}

export async function scanWorksheet(pages, info = {}, onProgress = () => {}) {
  const sections = [];
  let title = "";

  for (let i = 0; i < pages.length; i++) {
    onProgress(`Reading page ${i + 1} of ${pages.length}... 🔍`);
    const part = await callGroq([
      { type: "text", text: EXTRACT_PROMPT },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${pages[i]}` } },
    ]);
    if (!title && part.title) title = part.title;
    (part.sections || []).forEach((s) => sections.push(s));
  }

  const paper = {
    title,
    sections: sections
      .filter((s) => (s.questions || []).length)
      .map((s, si) => ({
        ...s,
        questions: s.questions.map((q, qi) => ({ ...q, id: `s${si}q${qi}` })),
      })),
  };

  if (!paper.sections.length)
    throw new Error("Could not read any questions. Try a clearer, straight photo.");

  onProgress("Making the answer key... 🧠");
  const answers = await solve(paper, info);
  paper.sections.forEach((s) =>
    s.questions.forEach((q) => {
      q.answer = answers[q.id] || "(guess) ";
    })
  );
  return paper;
}

export function gradeAnswers(items) {
  return callGroq([
    {
      type: "text",
      text: `You are a kind teacher marking answers from a young child. Ignore capitalization, small spelling slips and punctuation; accept answers with the same meaning.
- If "correct" starts with "e.g." it is only an example: mark the student correct if their answer is any valid answer for the question (for example any real rhyming word, or any real food item).
- If "correct" starts with "(guess)" it is only a likely answer: mark the student correct if their answer is a sensible, meaningful answer for that question (it can differ from the guess). Random letters, nonsense, off-topic text or a blank are wrong.
- Otherwise compare with "correct".
- A blank student answer is always wrong.
Return ONLY JSON: {"results":[{"id":"","correct":true}]}
${JSON.stringify(items)}`,
    },
  ]);
}