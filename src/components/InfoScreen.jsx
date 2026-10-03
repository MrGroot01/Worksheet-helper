export default function InfoScreen({ info, setInfo, error, onUpload }) {
  const ready = info.name.trim() && info.cls;

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
        <label className={`upload ${ready ? "" : "off"}`}>
          📸 Upload Worksheet
          <input type="file" accept="image/*" className="hidden" disabled={!ready} onChange={onUpload} />
        </label>
        {!ready && <p className="center">Type your name first 😊</p>}
        {error && <p className="err">⚠️ {error}</p>}
      </div>
    </div>
  );
}