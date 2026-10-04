export function beep(ok) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    (ok ? [660, 880] : [220, 170]).forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = ok ? "sine" : "square";
      o.frequency.value = f;
      g.gain.value = 0.07;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.12;
      o.start(t);
      o.stop(t + 0.12);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* sound is optional */
  }
}