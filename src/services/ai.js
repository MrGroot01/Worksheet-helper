const MODELS = [
  import.meta.env.VITE_GEMINI_MODEL || "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];
export const API_KEY = import.meta.env.VITE_API_KEY;

function contextText(info = {}) {
  const lines = [
    `This worksheet is for CBSE Class ${info.cls || "1"} in India (young children).`,
  ];
  if (info.book?.trim()) lines.push(`Book / lesson: ${info.book.trim()}.`);
  if (info.story?.trim()) lines.push(`Lesson text from the book:\n"""\n${info.story.trim()}\n"""`);
  return lines.join("\n");
}

function scanPrompt(info = {}, nWork = 1, nBook = 0, note = "") {
  const hasSource = !!info.story?.trim() || nBook > 0;
  return `${contextText(info)}

Image 1${nWork > 1 ? ` to ${nWork} are pages` : " is a page"} of a school worksheet.${
    nBook > 0 ? ` The images after ${nWork > 1 ? "them" : "it"} are pages from the child's TEXTBOOK lesson.` : ""
  } ${note}
Rebuild the worksheet as a BLANK one (IGNORE any handwritten answers, ticks, circles or lines drawn by a student) and ALSO solve every question yourself. Never leave an answer empty.
Think like the textbook and like a young child, not like a general adult. Keep answers short and in simple words.
Return ONLY JSON:
{"title":"","sections":[{"title":"section heading with instruction","type":"match|fill|short|choice","wordBox":["..."],"options":["..."],"questions":[{"text":"question text","answer":"correct answer","open":false,"count":1,"visual":"","scale":1,"choices":["..."]}]}]}
Rules:
- Do NOT put question numbers inside "text".
- match: "options" = right column items; each question text = left item; answer = EXACTLY one of "options", each option used only once, matched by meaning. If the items are pictures, write each one as an emoji or as shape:name (see pictures below), for example left "shape:triangle" and right "🍕".
- fill: put "____" exactly where the blank is and keep the rest of the sentence. If a word box exists put it in "wordBox" and answer = EXACTLY a word or letter from it. For a letter blank (like "____ air") answer = only the missing letter(s). If one question has several blanks, answer = the missing values in order separated by | (example: 2|5).
- short: questions that need a written answer, including number names and rearrange-the-letters questions. One correct answer: write it briefly.
- choice: questions the child answers by TAPPING one option. Use it for picture questions (count and circle, which group has more or less, big or small, tall or short, identify the shape), True/False (choices ["T","F"], answer T or F) and compare symbols (text keeps "____" like "13 ____ 31", choices ["<",">","="]). Put the options in "choices"; answer = EXACTLY one of them. A section made only of such questions has type "choice".
- Pictures: the child cannot see the original pictures, so REDRAW them with emojis in "visual" or in "choices", repeating the emoji exactly as many times as the picture shows (3 pencils = "✏️✏️✏️"). For a shape picture use shape:square, shape:rectangle, shape:triangle, shape:circle, shape:oval, shape:star or shape:diamond. If the same object is shown in different sizes (big/small, tall/short), use the SAME emoji for each and set "scale" (small 0.6, normal 1, big 1.6).
- Which group has more: one question per pair, text "", "choices" = the two groups drawn with emojis (example ["🍎🍎","🍎"]), answer = the bigger group exactly as written in choices.
- Count and circle: text "How many?", "visual" = the objects drawn, "choices" = the numbers printed under the picture, answer = the correct count.
- Identify the shape: "visual" = shape:name, choices = ["square","rectangle","triangle","circle"], answer = the right name.
- Big or small / tall or short: "visual" = the object, scale set as above, choices ["big","small"] or ["tall","short"].
- Colouring or drawing tasks cannot be done on screen: skip them.
- OPEN questions have MANY correct answers: rhyming words (example: "Pan -- ____"), "write 5 food items you like", "your favourite ...". For these set "open": true, give up to 3 example answers separated by commas in "answer" (example: "fan, man, can"), and use type short (or fill with a blank). Never mark maths questions open.
- "Write N items" questions (like "Write the names of 5 food items that you like to eat", even if the page shows N numbered lines): make ONE question only, with "open": true and "count": N. Do not make N separate questions.
- Maths: work out every sum carefully and double-check it. Write number names in simple lowercase words (example: forty-two).
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
const BUSY = [429, 500, 502, 503, 504];

async function callGemini(parts) {
  let lastMsg = "";
  for (let round = 0; round < 3; round++) {
    let wait = 8 + round * 8;
    let sawBusy = false;

    for (const model of MODELS) {
      let res;
      let data = {};
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
        data = await res.json().catch(() => ({}));
      } catch {
        sawBusy = true; // network hiccup: treat like busy
        continue;
      }

      if (res.ok) {
        const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
        return extractJson(text);
      }

      lastMsg = data.error?.message || "API error";
      const gone = res.status === 404 || /no longer available|not found/i.test(lastMsg);
      if (gone) continue; // this model is not available for this key: try the next one
      if (!BUSY.includes(res.status)) throw new Error(lastMsg); // a real error: show it

      sawBusy = true;
      const m = /retry in ([\d.]+)s/i.exec(lastMsg);
      if (m) wait = Math.min(Math.ceil(parseFloat(m[1])) + 1, 60);
    }

    if (!sawBusy) throw new Error(lastMsg || "No AI model is available for this key.");

    for (let s = wait; s > 0; s--) {
      notify(`The AI is busy, trying again ⏳ ${s}s`);
      await sleep(1000);
    }
  }
  throw new Error("The AI is very busy right now. Please press Start again in a minute.");
}

export async function scanWorksheet(pages, info = {}, onProgress = () => {}, bookPages = []) {
  notify = onProgress;
  const img = (b64) => ({ inline_data: { mime_type: "image/jpeg", data: b64 } });

  const sections = [];
  let title = "";

  // one page at a time: smaller requests pass more often
  for (let i = 0; i < pages.length; i++) {
    onProgress(`Reading page ${i + 1} of ${pages.length}... 🔍`);
    const note =
      pages.length > 1
        ? `This is page ${i + 1} of ${pages.length} of the worksheet. Rebuild only what is on this page.`
        : "";
    const raw = await callGemini([
      img(pages[i]),
      ...bookPages.map(img),
      { text: scanPrompt(info, 1, bookPages.length, note) },
    ]);
    if (!title && raw.title) title = raw.title;
    (raw.sections || []).forEach((s) => sections.push(s));
  }

  const paper = {
    title,
    sections: sections
      .filter((s) => (s.questions || []).length)
      .map((s, si) => {
        const questions = s.questions.map((q, qi) => {
          let answer = String(q.answer ?? "").trim() || "(guess) ";
          // open questions: keep the "e.g." marker so any valid answer is accepted
          if (q.open && !/^e\.g\./i.test(answer)) answer = `e.g. ${answer}`;
          const choices = Array.isArray(q.choices) ? q.choices.map((c) => String(c)).filter(Boolean) : [];
          return {
            ...q,
            id: `s${si}q${qi}`,
            answer,
            count: Number(q.count) || 1,
            choices,
            visual: q.visual ? String(q.visual) : "",
            scale: Number(q.scale) || 1,
          };
        });
        const allChoice = questions.every((q) => q.choices.length >= 2);
        const type = s.type === "match" ? "match" : allChoice ? "choice" : s.type;
        return { ...s, type, questions };
      }),
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