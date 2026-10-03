export default function InfoScreen({ info, setInfo, pages, busy, error, onAdd, onRemove, onStart }) {
  const ready = info.name.trim() && info.cls;
  const canAdd = ready && !busy;

  return (
    <div className="app">
      <div className="mascots"><span>🦁</span><span>🐼</span><span>🐰</span><span>🐯</span></div>
      <h1 className="title">Let's Play & Learn! 🌈</h1>
      <p className="sub">Upload your worksheet and have fun!</p>
      <div className="card">
        <input
          className="input"
          placeholder="👦 Your name"
          value={info.name}
          onChange={(e) => setInfo({ ...info, name: e.target.value })}
        />
        <select
          className="input"
          value={info.cls}
          onChange={(e) => setInfo({ ...info, cls: e.target.value })}
        >
          {["UKG", "1", "2", "3", "4", "5"].map((c) => (
            <option key={c} value={c}>🎒 Class {c}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="📚 Book / lesson name (optional)"
          value={info.book}
          onChange={(e) => setInfo({ ...info, book: e.target.value })}
        />
        <textarea
          className="input"
          rows={3}
          placeholder="📖 Paste the story here for exact answers (optional)"
          value={info.story}
          onChange={(e) => setInfo({ ...info, story: e.target.value })}
        />

        <label className={`upload ${canAdd ? "" : "off"}`}>
          {busy ? "⏳ Getting pages ready..." : pages.length ? "➕ Add more pages" : "📸 Add worksheet pages"}
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            disabled={!canAdd}
            onChange={onAdd}
          />
        </label>
        <p className="hint">Photos or PDF. Add pages in order (up to 6).</p>

        {pages.length > 0 && (
          <div className="thumbs">
            {pages.map((p, i) => (
              <div className="thumb" key={p.id}>
                <img src={`data:image/jpeg;base64,${p.b64}`} alt={`Page ${i + 1}`} />
                <span className="tn">{i + 1}</span>
                <button type="button" className="tx" onClick={() => onRemove(p.id)} aria-label="Remove page">✕</button>
              </div>
            ))}
          </div>
        )}

        {pages.length > 0 && (
          <div className="center">
            <button className="btn green" disabled={busy} onClick={onStart}>
              Start ✨ ({pages.length} page{pages.length > 1 ? "s" : ""})
            </button>
          </div>
        )}

        {!ready && <p className="center">Type your name first 😊</p>}
        {error && <p className="err">⚠️ {error}</p>}
      </div>
    </div>
  );
}