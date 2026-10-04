import { useCallback, useEffect, useState } from "react";

const WORDS = [
  ["cat", "🐱"], ["dog", "🐶"], ["sun", "☀️"], ["fish", "🐟"], ["apple", "🍎"], ["book", "📚"],
  ["ball", "⚽"], ["tree", "🌳"], ["milk", "🥛"], ["star", "⭐"], ["bird", "🐦"], ["cake", "🎂"],
  ["hand", "✋"], ["rose", "🌹"], ["pear", "🍐"], ["hat", "🎩"],
];
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const ROUND = 8;
const newDeck = () => [...WORDS].sort(() => Math.random() - 0.5).slice(0, ROUND);

export default function TypingGame() {
  const [deck, setDeck] = useState(newDeck);
  const [i, setI] = useState(0);
  const [pos, setPos] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [bad, setBad] = useState(false);
  const [win, setWin] = useState(false);

  const done = i >= deck.length;
  const [word, pic] = deck[i] || ["", ""];

  const press = useCallback(
    (ch) => {
      if (done || win) return;
      if (ch === word[pos]) {
        const np = pos + 1;
        setPos(np);
        if (np === word.length) {
          const n = streak + 1;
          setStreak(n);
          setBest((b) => Math.max(b, n));
          setWin(true);
        }
      } else {
        setStreak(0);
        setBad(true);
        setTimeout(() => setBad(false), 350);
      }
    },
    [done, win, word, pos, streak]
  );

  useEffect(() => {
    const h = (e) => {
      if (/^[a-z]$/i.test(e.key)) press(e.key.toLowerCase());
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [press]);

  useEffect(() => {
    if (!win) return;
    const t = setTimeout(() => {
      setI((x) => x + 1);
      setPos(0);
      setWin(false);
    }, 900);
    return () => clearTimeout(t);
  }, [win]);

  const again = () => {
    setDeck(newDeck());
    setI(0);
    setPos(0);
    setStreak(0);
    setBest(0);
    setWin(false);
  };

  if (done)
    return (
      <div className="center">
        <div className="big">🏆</div>
        <h2>Wow! You typed {deck.length} words!</h2>
        <p className="sub">Best streak: {best} 🔥</p>
        <button className="btn" onClick={again}>Play again 🔄</button>
      </div>
    );

  return (
    <div className="center">
      <div className="tg-top">
        <span>Word {i + 1}/{deck.length}</span>
        <span>🔥 {streak}</span>
      </div>
      <div className={`tg-pic ${win ? "hop" : ""}`}>{pic}</div>
      <div className={`tg-word ${bad ? "shake" : ""}`}>
        {word.split("").map((c, k) => (
          <span key={k} className={`tg-l ${k < pos ? "done" : k === pos ? "cur" : ""}`}>{c}</span>
        ))}
      </div>
      {win && <div className="cheer">🎉 Great!</div>}
      <div className="kb">
        {ROWS.map((row) => (
          <div className="krow" key={row}>
            {row.split("").map((ch) => (
              <button
                key={ch}
                type="button"
                className={`key ${ch === word[pos] ? "next" : ""}`}
                onClick={() => press(ch)}
              >
                {ch}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}