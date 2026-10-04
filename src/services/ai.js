const MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.8-flash";
export const API_KEY = import.meta.env.VITE_API_KEY;

function contextText(info = {}) {
  const lines = [
    `This worksheet is for CBSE Class ${info.cls || "1"} in India (young children).`,
  ];
  if (info.book?.trim()) lines.push(`Book / lesson: ${info.book.trim()}.`);
  if (info.story?.trim()) lines.push(`Lesson text from the book:\n"""\n${info.story.trim()}\n"""`);
  return lines.join("\n");
}

function scanPrompt(info = {}, nWork = 1, nBook = 0) {
  const hasSource = !!info.story?.trim() || nBook > 0;
  return `${contextText(info)}

Images 1 to ${nWork} are the pages of one school worksheet, in order.${
    nBook > 0 ? ` Images ${nWork + 1} to ${nWork + nBook} are pages from the child's TEXTBOOK lesson.` : ""
  }
Rebuild the worksheet as a BLANK one (IGNORE any handwritten answers, ticks, circles or lines drawn by a student) and ALSO solve every question yourself. Never leave an answer empty.
Think like the textbook and like a young child, not like a general adult. Keep answers short and in simple words.
Return ONLY JSON:
{"title":"","sections":[{"title":"section heading with instruction","type":"match|fill|short","wordBox":["..."],"options":["..."],"emojis":{"Hand":"✋"},"questions":[{"text":"question text","answer":"correct answer","open":false,"count":1}]}]}
Rules:
- Do NOT put question numbers inside "text".
- match: "options" = right column words; each question text = left word; answer = EXACTLY one word from "options", each option used only once, matched by meaning.
- fill: put "____" exactly where the blank is and keep the rest of the sentence. If a word box exists put it in "wordBox" and answer = EXACTLY a word or letter from it. For a letter blank (like "____ air") answer = only the missing letter(s). If one question has several blanks, answer = the missing values in order separated by | (example: 2|5).
- short: questions that need a written answer, including number names, True/False (answer T or F) and rearrange-the-letters type questions. One correct answer: write it briefly.
- OPEN questions have MANY correct answers: rhyming words (example: "Pan -- ____"), "write 5 food items you like", "your favourite ...", "write a word that starts with...". For these set "open": true, give up to 3 example answers separated by commas in "answer" (example: "fan, man, can"), and use type short (or fill with a blank).
- "Write N items" questions (like "Write the names of 5 food items that you like to eat", even if the page shows N numbered lines): make ONE question only, with "open": true and "count": N. Do not make N separate questions.
- Maths: work out every sum carefully and double-check it. Write number names in simple lowercase words (example: forty-two).
- Picture questions (count and circle, big or small, tall or short, shapes, colouring, circle the group): the child can look at the original page, so write the question in words (example: "How many books are there?" or "Which group has more, 1 or 2?") as type short and give the answer.
- Questions about a story or lesson: ${
    hasSource
      ? "answer ONLY from the lesson text / textbook pages, using the exact words and names written there (for example the exact place name like Tamil Nadu, never a general word like village or city). Do not add (guess)."
      : 'there is no textbook, so give the most likely answer a CBSE Class 1 book would use, with specific names, and start it with "(guess) ".'
  }`;
}

function extractJson(text) {
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI did not return valid data. Try again.");
  return JSON.parse(clean.slice(start, end + 1));
}

let notify = () => {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(parts, tries = 4) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    }
  );
  const data = await res.json();

  // busy or free limit: wait a little, then try again
  if ((res.status === 429 || res.status === 503) && tries > 0) {
    const m = /retry in ([\d.]+)s/i.exec(data.error?.message || "");
    const wait = Math.min(Math.ceil(m ? parseFloat(m[1]) : 8) + 1, 60);
    for (let s = wait; s > 0; s--) {
      notify(`Taking a short rest ⏳ ${s}s`);
      await sleep(1000);
    }
    return callGemini(parts, tries - 1);
  }

  if (!res.ok) throw new Error(data.error?.message || "API error");
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  return extractJson(text);
}

export async function scanWorksheet(pages, info = {}, onProgress = () => {}, bookPages = []) {
  notify = onProgress;
  onProgress("Reading your worksheet... 🔍");

  const img = (b64) => ({ inline_data: { mime_type: "image/jpeg", data: b64 } });
  const parts = [
    ...pages.map(img),
    ...bookPages.map(img),
    { text: scanPrompt(info, pages.length, bookPages.length) },
  ];
  const raw = await callGemini(parts);

  const paper = {
    title: raw.title || "",
    sections: (raw.sections || [])
      .filter((s) => (s.questions || []).length)
      .map((s, si) => ({
        ...s,
        questions: s.questions.map((q, qi) => {
          let answer = String(q.answer ?? "").trim() || "(guess) ";
          // open questions: keep the "e.g." marker so any valid answer is accepted
          if (q.open && !/^e\.g\./i.test(answer)) answer = `e.g. ${answer}`;
          return { ...q, id: `s${si}q${qi}`, answer, count: Number(q.count) || 1 };
        }),
      })),
  };

  if (!paper.sections.length)
    throw new Error("Could not read any questions. Try a clearer, straight photo.");
  return paper;
}

export function gradeAnswers(items) {
  return callGemini([
    {
      text: `You are a kind teacher marking answers from a young child. Ignore capitalization, small spelling slips and punctuation; accept answers with the same meaning.
- If "correct" starts with "e.g." the question is OPEN: the text after it is only an example. Mark the student correct if their answer is ANY valid answer for the question.
  - Rhyming words: correct if it is a real word that rhymes with the given word (same ending sound, for example pan: man, fan, can, ran, van) and is not the same word.
  - "Write N items" questions (like 5 food items): the student writes all items in one box, usually with commas. Correct only if they wrote N real, different items that fit the question.
  - Other open questions: any sensible, real answer that fits the question.
- If "correct" starts with "(guess)" it is only a likely answer: mark the student correct if their answer is a sensible, meaningful answer for that question (it can differ from the guess). Random letters, nonsense, off-topic text or a blank are wrong.
- Otherwise the answer comes from the book or from maths: mark correct only if the student's answer means the same as "correct" (numbers, names and places must match).
- A blank student answer is always wrong.
Return ONLY JSON: {"results":[{"id":"","correct":true}]}
${JSON.stringify(items)}`,
    },
  ]);
}