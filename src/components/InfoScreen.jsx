import { useState } from "react";
import Games from "./Games";

const CLASSES = ["UKG", "1", "2", "3", "4", "5"];
const TITLE = "Let's Play & Learn!".split("");

function Thumbs({ list, onRemove }) {
  if (!list.length) return null;
  return (
    <div className="thumbs">
      {list.map((p, i) => (
        <div className="thumb" key={p.id}>
          <img src={`data:image/jpeg;base64,${p.b64}`} alt={`Page ${i + 1}`} />
          <span className="tn">{i + 1}</span>
          <button type="button" className="tx" onClick={() => onRemove(p.id)} aria-label="Remove page">✕</button>
        </div>
      ))}
    </div>
  );
}

export default function InfoScreen({ info, setInfo, pages, bookPages, busy, error, onAdd, onRemove, onStart }) {
  const [playing, setPlaying] = useState(false);
  const name = info.name.trim();
  const canAdd = !!name && !busy;

  const say = !name
    ? "Hi friend! What's your name? 👋"
    : !pages.length
    ? `Hello ${name}! Add your worksheet 📸`
    : "Super! Press Start! 🚀";

  if (playing)
    return (
      <div className="app">
        <h1 className="title">🎮 Game Time!</h1>
        <div className="card">
          <Games />
        </div>
        <div className="center">
          <button className="btn" onClick={() => setPlaying(false)}>⬅️ Back</button>
        </div>
      </div>
    );

  return (
    <div className="app">
      <h1 className="game-title" aria-label="Let's Play and Learn">
        {TITLE.map((c, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.07}s` }}>{c === " " ? "\u00A0" : c}</span>
        ))}
      </h1>

      <div className="mascot-row">
        <div className="mascot">🦁</div>
        <div className="bubble">{say}</div>
      </div>

      <div className="card step">
        <div className="step-n">1</div>
        <input
          className="input"
          placeholder="👦 My name is..."
          value={info.name}
          onChange={(e) => setInfo({ ...info, name: e.target.value })}
        />
      </div>

      <div className="card">
        <div className="step">
          <div className="step-n">2</div>
          <b className="step-t">My class</b>
        </div>
        <div className="class-pick">
          {CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              className={`class-btn ${info.cls === c ? "on" : ""}`}
              onClick={() => setInfo({ ...info, cls: c })}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="step">
          <div className="step-n">3</div>
          <b className="step-t">Add your worksheet</b>
        </div>
        <label className={`dropzone ${canAdd ? "" : "off"}`}>
          <span className="drop-ico">{busy ? "⏳" : "📸"}</span>
          <span>
            {busy ? "Getting pages ready..." : pages.length ? "Add more pages" : "Tap to add photos or PDF"}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            disabled={!canAdd}
            onChange={(e) => onAdd(e, "work")}
          />
        </label>
        <p className="hint">Add pages in order (up to 6).</p>
        <Thumbs list={pages} onRemove={(id) => onRemove(id, "work")} />
        {!name && <p className="hint">Type your name first 😊</p>}
      </div>

      <details className="card more">
        <summary>👩‍🏫 Parent / teacher options (optional)</summary>
        <p className="hint">For story questions, add the lesson pages from the book. The answers will then match the book exactly.</p>
        <label className={`dropzone small ${canAdd ? "" : "off"}`}>
          <span>{bookPages.length ? "📚 Add more book pages" : "📚 Add book lesson pages"}</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            disabled={!canAdd}
            onChange={(e) => onAdd(e, "book")}
          />
        </label>
        <Thumbs list={bookPages} onRemove={(id) => onRemove(id, "book")} />
        <input
          className="input"
          placeholder="📚 Book / lesson name"
          value={info.book}
          onChange={(e) => setInfo({ ...info, book: e.target.value })}
        />
        <textarea
          className="input"
          rows={3}
          placeholder="📖 Or paste the story here"
          value={info.story}
          onChange={(e) => setInfo({ ...info, story: e.target.value })}
        />
      </details>

      {error && <p className="err">⚠️ {error}</p>}

      <div className="center">
        {pages.length > 0 && (
          <button className="btn green big" disabled={busy} onClick={onStart}>
            Start ✨
          </button>
        )}
        <div>
          <button className="btn blue" onClick={() => setPlaying(true)}>🎮 Play games</button>
        </div>
      </div>
    </div>
  );
}